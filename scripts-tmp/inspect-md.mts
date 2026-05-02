import { readFileSync } from 'fs'
const u = 'https_____www_eclectichive_com_rugs_atlas'
const md = JSON.parse(readFileSync(`/tmp/fc-cache/${u}.json`, 'utf-8')).markdown
// Print lines around each image, with line numbers
const lines = md.split('\n')
lines.forEach((l: string, i: number) => {
  if (/!\[/.test(l) || /^#/.test(l) || /related|you may|more from|browse/i.test(l)) {
    console.log(String(i).padStart(4), '|', l.slice(0, 200))
  }
})
