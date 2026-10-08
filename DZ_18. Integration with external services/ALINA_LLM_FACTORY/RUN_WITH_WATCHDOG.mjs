import {
  spawn
} from "node:child_process";

const target =
  process.argv[2];

const timeoutSeconds =
  Number(process.argv[3] || 240);

if (!target) {
  console.error(
    "Usage: node RUN_WITH_WATCHDOG.mjs <script> [timeout_seconds]"
  );

  process.exit(2);
}

if (
  !Number.isFinite(timeoutSeconds) ||
  timeoutSeconds < 1
) {
  console.error(
    "Invalid timeout:",
    timeoutSeconds
  );

  process.exit(2);
}

console.log("");
console.log(
  "=========================================="
);

console.log(
  " ALINA FACTORY WATCHDOG"
);

console.log(
  "=========================================="
);

console.log(
  "TARGET  :",
  target
);

console.log(
  "TIMEOUT :",
  `${timeoutSeconds}s`
);

console.log("");


const started =
  Date.now();


const child =
  spawn(
    process.execPath,
    [target],
    {
      stdio: "inherit",
      windowsHide: false
    }
  );


let timedOut =
  false;


const timer =
  setTimeout(
    () => {

      timedOut =
        true;

      const latency =
        Date.now() - started;

      console.error("");
      console.error(
        "=========================================="
      );

      console.error(
        " WATCHDOG TIMEOUT"
      );

      console.error(
        "=========================================="
      );

      console.error(
        "PID        :",
        child.pid
      );

      console.error(
        "LATENCY_MS :",
        latency
      );


      if (
        process.platform === "win32"
      ) {

        const killer =
          spawn(
            "taskkill",
            [
              "/PID",
              String(child.pid),
              "/T",
              "/F"
            ],
            {
              stdio: "inherit",
              windowsHide: true
            }
          );


        killer.on(
          "close",
          () => {
            process.exit(124);
          }
        );

      }
      else {

        child.kill(
          "SIGKILL"
        );

      }

    },
    timeoutSeconds * 1000
  );


child.on(
  "error",
  (error) => {

    clearTimeout(timer);

    console.error(
      "WATCHDOG CHILD ERROR:",
      error?.stack ||
      error?.message ||
      String(error)
    );

    process.exit(1);
  }
);


child.on(
  "close",
  (code, signal) => {

    clearTimeout(timer);

    if (timedOut) {
      return;
    }


    const latency =
      Date.now() - started;


    console.log("");
    console.log(
      "=========================================="
    );

    console.log(
      " WATCHDOG COMPLETE"
    );

    console.log(
      "=========================================="
    );

    console.log(
      "EXIT_CODE  :",
      code
    );

    console.log(
      "SIGNAL     :",
      signal ?? "none"
    );

    console.log(
      "LATENCY_MS :",
      latency
    );


    process.exit(
      Number.isInteger(code)
        ? code
        : 1
    );
  }
);
