// import dataAB from "../json/pt_BR_extended_AB.json";
// import dataCD from "../json/pt_BR_extended_CD.json";
// import dataEF from "../json/pt_BR_extended_EF.json";
// import dataGHI from "../json/pt_BR_extended_GHI.json";
// import dataJKL from "../json/pt_BR_extended_JKL.json";
// import dataMNO from "../json/pt_BR_extended_MNO.json";
// import dataPQR from "../json/pt_BR_extended_PQR.json";
// import dataSTU from "../json/pt_BR_extended_STU.json";
// import dataVXZ from "../json/pt_BR_extended_VXZ.json";

// Tipagem
type ExtendedWordMap = {
  [word: string]: {
    [flag: string]: string[];
  };
};

type MatchEntry = {
  word: string;
  flag: string;
  variations: string[];
};

// Junta todos os arquivos em um único objeto
const extendedData: ExtendedWordMap = {
  // ...dataAB,
  // ...dataCD,
  // ...dataEF,
  // ...dataGHI,
  // ...dataJKL,
  // ...dataMNO,
  // ...dataPQR,
  // ...dataSTU,
  // ...dataVXZ,
};

// Função de filtro
function filterWords(
  data: ExtendedWordMap,
  search: string,
  type: "starts" | "contains" | "ends"
): MatchEntry[] {
  const result: MatchEntry[] = [];

  for (const word of Object.keys(data)) {
    for (const flag of Object.keys(data[word])) {
      const matches: string[] = [];

      for (const variation of data[word][flag]) {
        if (
          (type === "starts" && variation.startsWith(search)) ||
          (type === "contains" && variation.includes(search)) ||
          (type === "ends" && variation.endsWith(search))
        ) {
          matches.push(variation);
          matches.push(word); // inclui a palavra original também
        }
      }

      if (matches.length > 0) {
        result.push({
          word,
          flag,
          variations: Array.from(new Set(matches)) // remove duplicatas
        });
      }
    }
  }

  return result;
}

// Uso da função
const searchTerm = "inar";
const searchType = "ends"; // "starts" | "contains" | "ends"

const results = filterWords(extendedData, searchTerm, searchType);

let list: string[] = [];

for (const entry of results) {
  list.push(...entry.variations);
}

list = Array.from(new Set(list));

console.log(list);
