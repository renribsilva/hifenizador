import fs from 'fs';
import path from 'path';

const affPath = path.join(process.cwd(), 'public', 'pt_BR.aff');
const dicPath = path.join(process.cwd(), 'public', 'pt_BR.dic');
const outputDir = path.join(process.cwd(), 'src', 'json');

// Caminhos dos arquivos de saída por faixa alfabética
const outputPathAB = path.join(outputDir, 'pt_BR_extended_AB.json');
const outputPathCD = path.join(outputDir, 'pt_BR_extended_CD.json');
const outputPathEF = path.join(outputDir, 'pt_BR_extended_EF.json');
const outputPathGHI = path.join(outputDir, 'pt_BR_extended_GHI.json');
const outputPathJKL = path.join(outputDir, 'pt_BR_extended_JKL.json');
const outputPathMNO = path.join(outputDir, 'pt_BR_extended_MNO.json');
const outputPathPQR = path.join(outputDir, 'pt_BR_extended_PQR.json');
const outputPathSTU = path.join(outputDir, 'pt_BR_extended_STU.json');
const outputPathVXZ = path.join(outputDir, 'pt_BR_extended_VXZ.json');

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

// Processamento de prefixos e sufixos
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

// Mapeamentos por grupos alfabéticos
const mapAB: { [key: string]: { [flag: string]: string[] } } = {};
const mapCD: { [key: string]: { [flag: string]: string[] } } = {};
const mapEF: { [key: string]: { [flag: string]: string[] } } = {};
const mapGHI: { [key: string]: { [flag: string]: string[] } } = {};
const mapJKL: { [key: string]: { [flag: string]: string[] } } = {};
const mapMNO: { [key: string]: { [flag: string]: string[] } } = {};
const mapPQR: { [key: string]: { [flag: string]: string[] } } = {};
const mapSTU: { [key: string]: { [flag: string]: string[] } } = {};
const mapVXZ: { [key: string]: { [flag: string]: string[] } } = {};

// Função para selecionar o mapa certo com base na primeira letra
function getMapByFirstLetter(letter: string) {
  if ('abc'.includes(letter)) return mapAB;
  if ('def'.includes(letter)) return mapCD;
  if ('def'.includes(letter)) return mapEF;
  if ('ghi'.includes(letter)) return mapGHI;
  if ('jkl'.includes(letter)) return mapJKL;
  if ('mno'.includes(letter)) return mapMNO;
  if ('pqr'.includes(letter)) return mapPQR;
  if ('stu'.includes(letter)) return mapSTU;

  // Tudo o que sobrar vai para mapVXZ
  return mapVXZ;
}

// Geração das variações por linha
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
    const targetMap = getMapByFirstLetter(firstLetter);
    if (targetMap) {
      targetMap[word] = wordVariations;
    }
  }
}

// Escrita dos arquivos
fs.writeFileSync(outputPathAB, JSON.stringify(mapAB, null, 2), 'utf-8');
fs.writeFileSync(outputPathCD, JSON.stringify(mapCD, null, 2), 'utf-8');
fs.writeFileSync(outputPathEF, JSON.stringify(mapEF, null, 2), 'utf-8');
fs.writeFileSync(outputPathGHI, JSON.stringify(mapGHI, null, 2), 'utf-8');
fs.writeFileSync(outputPathJKL, JSON.stringify(mapJKL, null, 2), 'utf-8');
fs.writeFileSync(outputPathMNO, JSON.stringify(mapMNO, null, 2), 'utf-8');
fs.writeFileSync(outputPathPQR, JSON.stringify(mapPQR, null, 2), 'utf-8');
fs.writeFileSync(outputPathSTU, JSON.stringify(mapSTU, null, 2), 'utf-8');
fs.writeFileSync(outputPathVXZ, JSON.stringify(mapVXZ, null, 2), 'utf-8');

console.log('✅ Arquivos JSON gerados: AB, CD, EF, GHI, JKL, MNO, PQR, STU, VXZ');
