import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', { status: 400 })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    return new Response('Error occurred', { status: 400 })
  }

  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, unsafe_metadata } = evt.data
    const client = await clerkClient()

    // Grab the role we passed from the SignUp component
    const role = (unsafe_metadata?.role as string) || 'candidate'

    // --- UPDATED SECTION START ---
    try {
      // Move it to PUBLIC metadata so the Middleware can see it
      await client.users.updateUserMetadata(id, {
        publicMetadata: {
          role: role,
        },
      })
      console.log(`✅ Success: Assigned role "${role}" to user ${id}`)
    } catch (error) {
      // If the user ID is fake (Testing mode) or not found, we log it but return 200
      // so Clerk doesn't keep retrying the webhook.
      console.error(`❌ Error updating metadata for user ${id}:`, error)
    }
    // --- UPDATED SECTION END ---
  }

  return new Response('', { status: 200 })
}