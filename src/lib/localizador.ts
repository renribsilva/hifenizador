import dataABC from "../json/pt_BR_extend_ABC.json";
import dataDEF from "../json/pt_BR_extend_DEF.json";
import dataGHI from "../json/pt_BR_extend_GHI.json";
import dataJKL from "../json/pt_BR_extend_JKL.json";
import dataMNO from "../json/pt_BR_extend_MNO.json";
import dataPQR from "../json/pt_BR_extend_PQR.json";
import dataSTU from "../json/pt_BR_extend_STU.json";
import dataVXZ from "../json/pt_BR_extend_VXZ.json";

type ExtendedWordMap = {
  [word: string]: {
    [flag: string]: string[];
  };
};

// Junta os dois arquivos em um único objeto
const extendedData: ExtendedWordMap = {
  ...dataABC,
  ...dataDEF,
  ...dataGHI,
  ...dataJKL,
  ...dataMNO,
  ...dataPQR,
  ...dataSTU,
  ...dataVXZ
};

function filterWords(
  data: ExtendedWordMap,
  search: string,
  type: 'starts' | 'contains' | 'ends'
): ExtendedWordMap {

  const result: ExtendedWordMap = {};

  for (const word of Object.keys(data)) {

    const wordVariations: { [flag: string]: string[] } = {};

    for (const flag of Object.keys(data[word])) {

      const matches: string[] = [];

      for (const variation of data[word][flag]) {
        if (
          (type === 'starts' && variation.startsWith(search)) ||
          (type === 'contains' && variation.includes(search)) ||
          (type === 'ends' && variation.endsWith(search))
        ) {
          matches.push(variation);
          matches.push(word);
        }
      }

      if (matches.length > 0) {
        wordVariations[flag] = Array.from(new Set(matches));
      }
    }

    if (Object.keys(wordVariations).length > 0) {
      result[word] = wordVariations;
    }
  }

  return result;
}

const searchTerm = "inar";
const searchType = "ends"; // 'starts' | 'contains' | 'ends'

const results = filterWords(extendedData, searchTerm, searchType);
console.log(JSON.stringify(results, null, 2));
