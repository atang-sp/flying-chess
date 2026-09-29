import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const schemaPath = path.resolve(__dirname, '../supabase-schema.sql')

const connectionString = process.argv[2] || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
const hasEnvParams = process.env.PGHOST && process.env.PGPASSWORD

if (!connectionString && !hasEnvParams) {
  console.error('\x1b[31m[错误] 未提供数据库连接参数！\x1b[0m')
  console.log(`
使用方式:
  1. 直接传参:
     node scripts/apply-supabase-schema.mjs "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

  2. 环境变量 (自动支持特殊字符密码):
     PGHOST="aws-0-ap-northeast-1.pooler.supabase.com" \\
     PGUSER="postgres.[PROJECT-REF]" \\
     PGPASSWORD="..." \\
     node scripts/apply-supabase-schema.mjs
`)
  process.exit(1)
}

if (!fs.existsSync(schemaPath)) {
  console.error(`\x1b[31m[错误] 找不到 schema 文件: ${schemaPath}\x1b[0m`)
  process.exit(1)
}

const sql = fs.readFileSync(schemaPath, 'utf-8')

console.log('\x1b[36m[1/3] 正在连接 Supabase PostgreSQL 数据库...\x1b[0m')

const clientConfig = connectionString
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    }
  : {
      host: process.env.PGHOST,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    }

const client = new pg.Client(clientConfig)

async function main() {
  try {
    await client.connect()
    console.log('\x1b[32m[✓] 数据库连接成功！\x1b[0m')

    console.log('\x1b[36m[2/3] 正在执行 supabase-schema.sql 初始化表结构、RLS 与触发器...\x1b[0m')
    await client.query(sql)
    console.log('\x1b[32m[✓] Schema 脚本执行成功！\x1b[0m')

    console.log('\x1b[36m[3/3] 正在验证表结构...\x1b[0m')
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'user_configs', 'game_progress')
      ORDER BY table_name;
    `)

    const createdTables = res.rows.map(r => r.table_name)
    console.log(`\x1b[32m[✓] 验证通过！已就绪的表: ${createdTables.join(', ')}\x1b[0m`)

    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'user_configs', 'game_progress');
    `)
    console.log('\x1b[32m[✓] 行级安全 (RLS) 状态:\x1b[0m')
    rlsRes.rows.forEach(r => {
      console.log(`    - ${r.tablename}: RLS ${r.rowsecurity ? '已启用 (Enabled)' : '未启用'}`)
    })

    console.log('\n\x1b[32m🎉 飞行棋云端数据库表与安全策略初始化全部完成！\x1b[0m\n')
  } catch (err) {
    console.error('\x1b[31m[执行失败]\x1b[0m', err.message)
    if (err.code === '28P01') {
      console.error('\x1b[33m提示: 密码错误，请检查密码是否正确。\x1b[0m')
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      console.error('\x1b[33m提示: 无法连接到 Supabase 主机，请检查网络或主机名是否正确。\x1b[0m')
    }
    process.exit(1)
  } finally {
    await client.end().catch(() => {})
  }
}

main()
