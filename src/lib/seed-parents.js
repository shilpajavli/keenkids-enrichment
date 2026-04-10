// Run with: node src/lib/seed-parents.js
// Make sure your .env.local is set up correctly

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PARENT_STUDENT_MAP = [
  { parentEmail: 'wendy.wuyan@gmail.com',        parentName: 'Wendy Wu',        studentFirst: 'David',     studentLast: 'Liu' },
  { parentEmail: 'gayathribadhri@gmail.com',      parentName: 'Gayathri Badhri', studentFirst: 'Varad',     studentLast: 'Madabusi' },
  { parentEmail: 'kratisalgia88@gmail.com',        parentName: 'Krati Salgia',    studentFirst: 'Ahana',     studentLast: 'Jain' },
  { parentEmail: 'aks.gandhi@gmail.com',           parentName: 'AK Gandhi',       studentFirst: 'Jeeva',     studentLast: 'Gandhi' },
  { parentEmail: 'chandana.rathan@gmail.com',      parentName: 'Chandana Rathan', studentFirst: 'Maira',     studentLast: 'Ram' },
  { parentEmail: 'engeng228@yahoo.com',            parentName: 'Tan Parent',      studentFirst: 'Shekinah',  studentLast: 'Tan' },
  { parentEmail: 'engeng228@yahoo.com',            parentName: 'Tan Parent',      studentFirst: 'Seraphina', studentLast: 'Tan' },
  { parentEmail: 'anshuj@gmail.com',               parentName: 'Anshu J',         studentFirst: 'Kairav',    studentLast: 'Rao' },
  { parentEmail: 'anshuj@gmail.com',               parentName: 'Anshu J',         studentFirst: 'Neil',      studentLast: 'Dalal' },
  { parentEmail: 'namratagulwadi@gmail.com',       parentName: 'Namrata Gulwadi', studentFirst: 'Mahathi',   studentLast: 'Arun' },
  { parentEmail: 'meenatchi.ponnuraj@gmail.com',   parentName: 'Meenatchi P',     studentFirst: 'Neel',      studentLast: 'Nagarmat' },
  { parentEmail: 'meenatchi.ponnuraj@gmail.com',   parentName: 'Meenatchi P',     studentFirst: 'Vishwa',    studentLast: 'Sarvesh' },
]

async function run() {
  // Cache invited parents so we don't invite same email twice
  const invited = {}

  for (const entry of PARENT_STUDENT_MAP) {
    const email = entry.parentEmail.toLowerCase()

    // Get or create parent user
    if (!invited[email]) {
      const { data: existing } = await admin.auth.admin.listUsers()
      let user = existing?.users.find(u => u.email?.toLowerCase() === email)

      if (!user) {
        console.log(`Creating ${email}...`)
        const { data, error } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: entry.parentName },
        })
        if (error) { console.error(`  Error creating ${email}:`, error.message); continue }
        user = data.user
      } else {
        console.log(`User ${email} already exists`)
      }

      // Upsert profile
      await admin.from('profiles').upsert({
        id: user.id,
        email: email,
        full_name: entry.parentName,
        role: 'parent',
      }, { onConflict: 'id' })

      invited[email] = user.id
    }

    const parentId = invited[email]

    // Find student and link
    const { data: students } = await admin.from('students')
      .select('id, full_name')
      .eq('first_name', entry.studentFirst)
      .eq('last_name', entry.studentLast)

    if (!students?.length) {
      console.error(`  Student not found: ${entry.studentFirst} ${entry.studentLast}`)
      continue
    }

    const { error } = await admin.from('students')
      .update({ parent_id: parentId })
      .eq('id', students[0].id)

    if (error) console.error(`  Error linking ${entry.studentFirst}:`, error.message)
    else console.log(`  ✓ Linked ${entry.studentFirst} ${entry.studentLast} → ${email}`)
  }

  console.log('\nDone!')
}

run().catch(console.error)
