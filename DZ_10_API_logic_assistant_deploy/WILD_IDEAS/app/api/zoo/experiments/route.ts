import modelEval from '@/knowledge/zoo/model-eval-cases.json';

export async function GET() {
  return Response.json(modelEval);
}
