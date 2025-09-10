import fs from "fs";
import path from "path";

// Caminhos dos arquivos
const affPath = path.join(process.cwd(), "public", "pt_BR.aff");
const dicPath = path.join(process.cwd(), "public", "pt_BR.dic");
const outputDir = path.join(process.cwd(), "src", "json", "ptBRJson");

// Leitura dos arquivos .aff e .dic
const rawAff = fs.readFileSync(affPath, "utf-8");
const rawDic = fs.readFileSync(dicPath, "utf-8");

// Processamento das linhas do arquivo .aff
const affLines = rawAff
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean)
  .filter(
    line =>
      !line.startsWith("#") &&
      !line.startsWith("SET ") &&
      !line.startsWith("FLAG ") &&
      !line.startsWith("TRY ") &&
      !line.startsWith("MAP ") &&
      !line.startsWith("BREAK ") &&
      !line.startsWith("MAXNGRAMSUGS 12") &&
      !line.includes("NOSUGGEST Ý") &&
      !line.includes("FORBIDDENWORD ý") &&
      !line.includes("MAXDIFF 10") &&
      !line.includes("ONLYMAXDIFF") &&
      !line.includes("WARN ~")
  );

// Processamento das linhas do arquivo .dic
const dicLines = rawDic
  .split(/\r?\n/)
  .filter(Boolean);

const affData = {
  PFX: {},
  SFX: {}
};

// Processamento de prefixos e sufixos
for (const line of affLines) {
  const parts = line.split(/\s+/);

  if (line.startsWith("PFX")) {
    const [, name, cross] = parts;
    if (parts.length <= 4) {
      affData.PFX[name] = { cross: cross === "Y", rules: [] };
    } else {
      affData.PFX[name].rules.push({
        strip: parts[2],
        add: parts[3],
        condition: parts[4] === "." ? null : parts[4]
      });
    }
  }

  if (line.startsWith("SFX")) {
    const [, name, cross] = parts;
    if (parts.length <= 4) {
      affData.SFX[name] = { cross: cross === "Y", rules: [] };
    } else {
      affData.SFX[name].rules.push({
        strip: parts[2],
        add: parts[3],
        condition: parts[4] === "." ? null : parts[4]
      });
    }
  }
}

// Mapas por letras do alfabeto
const alphabetMaps: { [letter: string]: { [word: string]: { [flag: string]: string[] } } } = {};

// Função para selecionar o mapa certo com base na primeira letra (sem acento)
function getMapByFirstLetter(letter: string) {
  const normalizedLetter = letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return alphabetMaps[normalizedLetter] || (alphabetMaps[normalizedLetter] = {});
}

// Criação da pasta ptBRJson se não existir
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Geração das variações por linha
for (let line of dicLines) {
  line = line.trim();

  if (!line || !line.includes("/") || line.includes("Ý") || line.includes("ý")) {
    continue;
  }

  const [entry] = line.split(/\s+/);
  const [word, rawFlags] = entry.split("/");
  const flags = rawFlags ? rawFlags.split("") : [];
  const wordVariations: { [flag: string]: string[] } = {};

  const ignoredFlags = new Set([
    "5", "6", "7", "8", "9", "k", "a", "c", "d", "e", "f", "g", "h", "i", "j",
    "k", "m", "n", "o", "p", "q", "r", "s", "v", "E", "G", "L", "O", "P", 
    "Q", "R", "S", "T", "U", "V", "W"
  ]);

  for (const flag of flags) {

    if (ignoredFlags.has(flag)) {
      continue;
    }

    const variations: string[] = [];

    if (affData.PFX[flag]) {
      for (const rule of affData.PFX[flag].rules) {
        let baseWord = word;
        const regex = rule.condition ? new RegExp(`^${rule.condition}`) : null;

        if (!regex || regex.test(word)) {
          if (rule.strip && rule.strip !== "0") {
            baseWord = baseWord.replace(new RegExp(`^${rule.strip}`), "");
          }
          const newWord = rule.add + baseWord;
          variations.push(newWord);
        }
      }
    }

    if (affData.SFX[flag]) {
      for (const rule of affData.SFX[flag].rules) {
        let baseWord = word;
        const regex = rule.condition ? new RegExp(`${rule.condition}$`) : null;

        if (!regex || regex.test(word)) {
          if (rule.strip && rule.strip !== "0") {
            baseWord = baseWord.replace(new RegExp(`${rule.strip}$`), "");
          }
          const newWord = baseWord + rule.add;
          variations.push(newWord);
        }
      }
    }

    if (variations.length > 0) {
      if (!wordVariations[flag]) {
        wordVariations[flag] = [];
      }
      variations.forEach(variation => {
        if (!wordVariations[flag].includes(variation)) {
          wordVariations[flag].push(variation);
        }
      });
    }
  }

  const flagComb = [];
  for (let i = 0; i < flags.length; i++) {
    for (let j = i + 1; j < flags.length; j++) {
      flagComb.push([flags[i], flags[j]]);
    }
  }

  const pfxFlags = "ÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÑÝàáâãäèéêëìíîïòóôõöùúûüñÿ";
  const sfxFlags = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

  const X = () => {
    return flagComb.filter(([first, second]) => {
      return ((pfxFlags.includes(first) && sfxFlags.includes(second)) ||
            (sfxFlags.includes(first) && pfxFlags.includes(second)));
    });
  };

  const flagCombFiltered = X();

  if (flagCombFiltered.length > 0) { 
    const variations: string[] = [];

    for (const [flag1, flag2] of flagCombFiltered) {
      if (affData.PFX[flag2]?.cross && affData.SFX[flag1]?.cross) {
        const pfxRules = affData.PFX[flag2].rules;
        for (const rule of pfxRules) {
          let baseWord = word;
          const regex = rule.condition ? new RegExp(`^${rule.condition}`) : null;
          if (!regex || regex.test(word)) {
            if (rule.strip && rule.strip !== "0") {
              baseWord = baseWord.replace(new RegExp(`^${rule.strip}`), "");
            }
            const intermediateWord = rule.add + baseWord;
            const sfxRules = affData.SFX[flag1].rules;
            for (const sfxRule of sfxRules) {
              let finalWord = intermediateWord;
              const sfxRegex = sfxRule.condition ? new RegExp(`${sfxRule.condition}$`) : null;
              if (!sfxRegex || sfxRegex.test(intermediateWord)) {
                if (sfxRule.strip && sfxRule.strip !== "0") {
                  finalWord = finalWord.replace(new RegExp(`${sfxRule.strip}$`), "");
                }
                finalWord += sfxRule.add;
                variations.push(finalWord);
                wordVariations[`${flag2}+${flag1}`] = wordVariations[`${flag2}+${flag1}`] || [];
                wordVariations[`${flag2}+${flag1}`].push(finalWord);
              }
            }
          }
        }
      }
    }
  }

  if (Object.keys(wordVariations).length > 0) {
    const firstLetter = word[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const targetMap = getMapByFirstLetter(firstLetter);
    if (targetMap) {
      targetMap[word] = wordVariations;
    }
  }
}

// Escrita dos arquivos por letra
Object.entries(alphabetMaps).forEach(([letter, map]) => {
  const outputPath = path.join(outputDir, `${letter.toUpperCase()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(map, null, 2), "utf-8");
});

console.log("Arquivos JSON gerados por letra do alfabeto.");
