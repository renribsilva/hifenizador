import fs from 'fs';
import path from 'path';

const affPath = path.join(process.cwd(), 'public', 'pt_BR.aff');
const dicPath = path.join(process.cwd(), 'public', 'pt_BR.dic');
const outputDir = path.join(process.cwd(), 'src', 'json');

const outputPathAtoD = path.join(outputDir, 'pt_BR_extend_AD.json');
const outputPathEtoM = path.join(outputDir, 'pt_BR_extend_EM.json');
const outputPathNtoZ = path.join(outputDir, 'pt_BR_extend_NZ.json');

const rawAff = fs.readFileSync(affPath, 'utf-8');
const rawDic = fs.readFileSync(dicPath, 'utf-8');

const affLines = rawAff
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean)
  .filter(
    line =>
      !line.startsWith('#') &&
      !line.startsWith('SET ') &&
      !line.startsWith('FLAG ') &&
      !line.startsWith('TRY ') &&
      !line.startsWith('MAP ') &&
      !line.startsWith('BREAK ') &&
      !line.startsWith('MAXNGRAMSUGS 12') &&
      !line.includes('NOSUGGEST Ý') &&
      !line.includes('FORBIDDENWORD ý') &&
      !line.includes('MAXDIFF 10') &&
      !line.includes('ONLYMAXDIFF') &&
      !line.includes('WARN ~')
  );

let dicLines = rawDic
  .split(/\r?\n/)
  .filter(Boolean);

const affData = {
  PFX: {} as any,
  SFX: {} as any
};

// Processa regras de prefixos e sufixos
for (const line of affLines) {
  const parts = line.split(/\s+/);

  if (line.startsWith('PFX')) {
    const [, name, cross] = parts;
    if (parts.length <= 4) {
      affData.PFX[name] = { cross: cross === 'Y', rules: [] };
    } else {
      affData.PFX[name].rules.push({
        strip: parts[2],
        add: parts[3],
        condition: parts[4] === '0' || parts[4] === '.' ? null : parts[4]
      });
    }
  }

  if (line.startsWith('SFX')) {
    const [, name, cross] = parts;
    if (parts.length <= 4) {
      affData.SFX[name] = { cross: cross === 'Y', rules: [] };
    } else {
      affData.SFX[name].rules.push({
        strip: parts[2],
        add: parts[3],
        condition: parts[4] === '.' ? null : parts[4]
      });
    }
  }
}

// Mapas divididos
const wordMapAtoD: { [key: string]: { [flag: string]: string[] } } = {};
const wordMapEtoM: { [key: string]: { [flag: string]: string[] } } = {};
const wordMapNtoZ: { [key: string]: { [flag: string]: string[] } } = {};

for (let line of dicLines) {
  line = line.trim();

  if (!line || !line.includes('/') || line.includes('Ý') || line.includes('ý')) {
    continue;
  }

  const [entry] = line.split(/\s+/);
  const [word, rawFlags] = entry.split('/');
  const flags = rawFlags ? rawFlags.split('') : [];
  const wordVariations: { [flag: string]: string[] } = {};

  for (const flag of flags) {
    let pfxWord = word;
    let variations: string[] = [];

    if (affData.PFX[flag]) {
      for (const rule of affData.PFX[flag].rules) {
        let baseWord = word;
        const regex = rule.condition ? new RegExp(`^${rule.condition}`) : null;

        if (!regex || regex.test(word)) {
          if (rule.strip && rule.strip !== '0') {
            baseWord = baseWord.replace(new RegExp(`^${rule.strip}`), '');
          }
          const newWord = rule.add + baseWord;
          variations.push(newWord);
          pfxWord = newWord;
        }
      }
    }

    if (affData.SFX[flag]) {
      for (const rule of affData.SFX[flag].rules) {
        let baseWord = word;
        const regex = rule.condition ? new RegExp(`${rule.condition}$`) : null;

        if (!regex || regex.test(word)) {
          if (rule.strip && rule.strip !== '0') {
            baseWord = baseWord.replace(new RegExp(`${rule.strip}$`), '');
          }
          const newWord = baseWord + rule.add;
          variations.push(newWord);
        }
      }
    }

    if (affData.PFX[flag]?.cross && affData.SFX[flag]?.cross) {
      for (const rule of affData.SFX[flag].rules) {
        let baseWord = pfxWord;
        const regex = rule.condition ? new RegExp(`${rule.condition}$`) : null;

        if (!regex || regex.test(word)) {
          if (rule.strip && rule.strip !== '0') {
            baseWord = baseWord.replace(new RegExp(`${rule.strip}$`), '');
          }
          const newWord = baseWord + rule.add;
          variations.push(newWord);
        }
      }
    }

    if (variations.length > 0) {
      wordVariations[flag] = Array.from(new Set(variations));
    }
  }

  if (Object.keys(wordVariations).length > 0) {
    const firstLetter = word[0].toLowerCase();
    if (firstLetter >= 'a' && firstLetter <= 'd') {
      wordMapAtoD[word] = wordVariations;
    } else if (firstLetter >= 'e' && firstLetter <= 'm') {
      wordMapEtoM[word] = wordVariations;
    } else {
      wordMapNtoZ[word] = wordVariations;
    }
  }
}

// Salva arquivos separados
fs.writeFileSync(outputPathAtoD, JSON.stringify(wordMapAtoD, null, 2), 'utf-8');
fs.writeFileSync(outputPathEtoM, JSON.stringify(wordMapEtoM, null, 2), 'utf-8');
fs.writeFileSync(outputPathNtoZ, JSON.stringify(wordMapNtoZ, null, 2), 'utf-8');

console.log('Arquivos JSON AD, EM e NZ gerados com sucesso!');
