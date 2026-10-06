import { getLiveSnapshot } from '@/lib/live'

export const revalidate = 60

export async function GET() {
  return Response.json(await getLiveSnapshot())
}
