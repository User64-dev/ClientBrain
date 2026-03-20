import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('client_memories')
      .select('client_id, memory, updated_at, clients(name)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch memories: ${error.message}`)
    }

    const memories = (data ?? []).map((row) => {
      const client = row.clients as unknown as { name: string } | null
      return {
        client_id: row.client_id,
        client_name: client?.name ?? 'Unknown Client',
        memory: row.memory,
        updated_at: row.updated_at,
      }
    })

    return NextResponse.json({ memories })
  } catch (error) {
    console.error('Fetch memories error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    )
  }
}
