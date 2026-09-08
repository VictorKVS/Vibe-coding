import io
import asyncio
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend import recorder_stt as stt


def wav(seconds=1, rate=16000):
    stream = io.BytesIO()
    with wave.open(stream, 'wb') as writer:
        writer.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        writer.writeframes(b'\0\0' * (seconds * rate))
    return stream.getvalue()


class RecorderTests(unittest.TestCase):
    def setUp(self):
        stt.lock = asyncio.Lock()

    def test_waits_for_previous_request(self):
        class Request:
            async def is_disconnected(self): return False
        async def exercise():
            await stt.lock.acquire()
            entered = asyncio.Event()
            async def pending():
                async with stt.recognition_slot(Request()): entered.set()
            task = asyncio.create_task(pending())
            await asyncio.sleep(.3)
            self.assertFalse(entered.is_set())
            stt.lock.release()
            await asyncio.wait_for(task, 1)
            self.assertTrue(entered.is_set())
            self.assertFalse(stt.lock.locked())
        asyncio.run(exercise())

    def test_cancel_waiter_preserves_running_lock(self):
        class Request:
            disconnected = False
            async def is_disconnected(self): return self.disconnected
        async def exercise():
            await stt.lock.acquire()
            request = Request()
            async def pending():
                async with stt.recognition_slot(request): self.fail('Cancelled waiter entered')
            task = asyncio.create_task(pending())
            await asyncio.sleep(.05)
            request.disconnected = True
            with self.assertRaises(stt.HTTPException) as error: await task
            self.assertEqual(error.exception.status_code, 499)
            self.assertTrue(stt.lock.locked())
            stt.lock.release()
        asyncio.run(exercise())

    def test_queue_timeout(self):
        class Request:
            async def is_disconnected(self): return False
        async def exercise():
            with patch.object(stt, 'WAIT_SECONDS', 0):
                with self.assertRaises(stt.HTTPException) as error:
                    async with stt.recognition_slot(Request()): self.fail('Expired waiter entered')
                self.assertEqual(error.exception.status_code, 504)
                self.assertFalse(stt.lock.locked())
        asyncio.run(exercise())

    def test_disconnect_kills_process(self):
        class Process:
            returncode = None
            killed = False
            def kill(self): self.killed = True; self.returncode = -1
            async def wait(self): return self.returncode
        class Request:
            calls = 0
            async def is_disconnected(self):
                self.calls += 1
                return self.calls > 1
        class Upload:
            async def read(self, limit): return wav()
            async def close(self): pass
        async def exercise():
            process = Process()
            async def spawn(*args, **kwargs): return process
            with tempfile.TemporaryDirectory() as folder:
                file = Path(folder) / 'runtime'; file.touch()
                with patch.object(stt, 'runtime', return_value=(file, file)), patch.object(stt.asyncio, 'create_subprocess_exec', side_effect=spawn):
                    with self.assertRaises(stt.HTTPException) as error:
                        await stt.segment(Request(), Upload())
                    self.assertEqual(error.exception.status_code, 499)
                    self.assertTrue(process.killed)
                    self.assertFalse(stt.lock.locked())
        asyncio.run(exercise())

    def test_validate(self):
        self.assertEqual(stt.validate_audio(wav()), 1)
        for data in [b'bad', wav(rate=8000), wav(seconds=32), wav()[:-10]]:
            with self.assertRaises(stt.HTTPException): stt.validate_audio(data)

    def test_service_success_and_error(self):
        with tempfile.TemporaryDirectory() as folder:
            exe = Path(folder) / 'whisper.exe'; exe.touch()
            model = Path(folder) / 'model.bin'; model.touch()
            class Process:
                returncode = None
                async def wait(self): self.returncode = 0
                def kill(self): self.returncode = -1
            async def spawn(*args, **kwargs):
                out = Path(args[args.index('-of') + 1]).with_suffix('.txt')
                out.write_text('Тестовая речь', encoding='utf-8')
                return Process()
            with patch.object(stt, 'runtime', return_value=(exe, model)), patch.object(stt.asyncio, 'create_subprocess_exec', side_effect=spawn):
                with TestClient(stt.app) as client:
                    self.assertTrue(client.get('/health').json()['ready'])
                    self.assertEqual(client.post('/segment', files={'audio': ('a.wav', b'bad')}).status_code, 422)
                    response = client.post('/segment', files={'audio': ('a.wav', wav())})
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json()['text'], 'Тестовая речь')


if __name__ == '__main__': unittest.main()
