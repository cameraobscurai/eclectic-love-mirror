import { readFileSync } from 'fs'
const md = JSON.parse(readFileSync('/tmp/fc-cache/https_www_eclectichive_com_rugs_atlas.json', 'utf-8')).markdown
const lines = md.split('\n')
lines.forEach((l: string, i: number) => {
  if (/!\[/.test(l) || /^#/.test(l) || /related|you may|more from|browse|other |similar/i.test(l) || /^\s*Back\s*$/.test(l) || l.includes('Inquire') || l.includes('Add to')) {
    console.log(String(i).padStart(4), '|', l.slice(0, 220))
  }
})
