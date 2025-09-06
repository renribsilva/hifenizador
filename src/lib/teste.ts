import fs from 'fs';
import path from 'path';
import { hifenizador } from './hifenizador';

const my_path = path.join(process.cwd(), 'public', 'pt_BR.dic');
const libPath = path.join(process.cwd(), 'lib');
const rawWords = fs.readFileSync(my_path, 'utf-8')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .map(word => word.replace(/\/.*/, ''))
  .filter(word => !/\d/.test(word))
  // .filter(word => !/^[A-ZÀ-Ý]/.test(word))
  .filter(word => !word.includes("."));

const my_hyph_path = path.join(process.cwd(), 'public', 'hyph_pt_BR.dic');
const rawPatterns = fs.readFileSync(my_hyph_path, 'utf-8')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.length > 0 && !line.match("UTF-8") && !line.match("4'4"));


const wordsWithIssues: string[] = [];
const total = rawWords.length;
const progressStep = Math.floor(total / 100) || 1; // atualiza a cada 1% aprox.

const outputPath = path.join(libPath, 'wordsWithIssues.json');

// Inicializa o arquivo JSON vazio
fs.writeFileSync(outputPath, JSON.stringify([], null, 2), 'utf-8');

for (let i = 0; i < total; i++) {
  const x = rawWords[i];
  const { getWord, word } = hifenizador(x, rawPatterns);

  if (getWord) {
    wordsWithIssues.push(word);
    fs.writeFileSync(outputPath, JSON.stringify(wordsWithIssues, null, 2), 'utf-8');
  }

  if (i % progressStep === 0 || i === total - 1) {
    const percent = ((i + 1) / total * 100).toFixed(1);
    process.stdout.write(`\rProgresso: ${percent}% (${i + 1}/${total})`);
  }
}

console.log(`\nMatrizes não montadas: ${wordsWithIssues.length}`);
console.log(`Total de palavras processadas: ${rawWords.length}`);