// All 88 IAU constellations
// stars: [x, y] positions in local space (~±5 units)
// lines: [indexA, indexB] pairs connecting stars
// wikiKey: Wikipedia article key for page/summary API

export const CONSTELLATIONS = [
  {
    name: 'Andromeda',
    wikiKey: 'Andromeda_(constellation)',
    stars: [[0,0],[1.5,0.8],[3.2,0.4],[4.8,0.1],[1.5,-1.8],[1.5,-3.5]],
    lines: [[0,1],[1,2],[2,3],[1,4],[4,5]]
  },
  {
    name: 'Antlia',
    wikiKey: 'Antlia',
    stars: [[-1.5,0.5],[0,1],[1.5,-0.5],[0,-1]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Apus',
    wikiKey: 'Apus',
    stars: [[0,2],[1,0.5],[-1,-0.5],[0,-2]],
    lines: [[0,1],[1,2],[2,3]]
  },
  {
    name: 'Aquarius',
    wikiKey: 'Aquarius_(constellation)',
    stars: [[-1,4],[0,2.5],[1.5,2],[0.5,0.5],[-1,-0.5],[1,-1.5],[-2,-2],[2,-3]],
    lines: [[0,1],[1,2],[2,3],[3,4],[3,5],[4,6],[5,7]]
  },
  {
    name: 'Aquila',
    wikiKey: 'Aquila_(constellation)',
    stars: [[0,3.5],[0,2],[0,0],[-2.5,-1],[2.5,-1],[0,-3]],
    lines: [[0,1],[1,2],[2,3],[2,4],[2,5]]
  },
  {
    name: 'Ara',
    wikiKey: 'Ara_(constellation)',
    stars: [[-1.5,1.5],[1.5,1.5],[2,0],[1,-1.5],[-1,-1.5],[-2,0]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]
  },
  {
    name: 'Aries',
    wikiKey: 'Aries_(constellation)',
    stars: [[0,0],[2,0.5],[3.5,0.2],[4.5,0.8]],
    lines: [[0,1],[1,2],[2,3]]
  },
  {
    name: 'Auriga',
    wikiKey: 'Auriga_(constellation)',
    stars: [[0,4],[3,2],[3.5,-0.5],[1,-3],[-2,-2],[-3,0.5],[1,1.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,6],[6,3]]
  },
  {
    name: 'Boötes',
    wikiKey: 'Boötes',
    stars: [[0,4.5],[-2,2],[2,2],[-3,-0.5],[3,-0.5],[-1,-2],[1,-2],[0,-3.5]],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,7]]
  },
  {
    name: 'Caelum',
    wikiKey: 'Caelum',
    stars: [[-1,1],[1,1],[0,-1.5]],
    lines: [[0,1],[1,2],[2,0]]
  },
  {
    name: 'Camelopardalis',
    wikiKey: 'Camelopardalis',
    stars: [[-0.5,4],[1,2],[0,0],[-2,-1.5],[2,-2]],
    lines: [[0,1],[1,2],[2,3],[2,4]]
  },
  {
    name: 'Cancer',
    wikiKey: 'Cancer_(constellation)',
    stars: [[-2,2],[0,0.5],[2,2],[-1.5,-1.5],[1.5,-1.5]],
    lines: [[0,1],[1,2],[1,3],[1,4]]
  },
  {
    name: 'Canes Venatici',
    wikiKey: 'Canes_Venatici',
    stars: [[0,1.5],[2,-1.5]],
    lines: [[0,1]]
  },
  {
    name: 'Canis Major',
    wikiKey: 'Canis_Major',
    stars: [[0,4],[0,2],[-1.5,0.5],[1.5,0.5],[-2,-1],[0,-2],[1.5,-3],[-0.5,-4]],
    lines: [[0,1],[1,2],[1,3],[2,4],[3,5],[5,6],[5,7]]
  },
  {
    name: 'Canis Minor',
    wikiKey: 'Canis_Minor',
    stars: [[0,2],[0,-2]],
    lines: [[0,1]]
  },
  {
    name: 'Capricornus',
    wikiKey: 'Capricornus',
    stars: [[-4,2],[-2,3],[0,2],[2,1],[3,-0.5],[2,-2],[0,-2.5],[-2,-2],[-4,0]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,0]]
  },
  {
    name: 'Carina',
    wikiKey: 'Carina_(constellation)',
    stars: [[-5,0],[-3,1.5],[-1,2],[1.5,1.5],[4,0],[4,-2],[0,-2],[-4,-1]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]]
  },
  {
    name: 'Cassiopeia',
    wikiKey: 'Cassiopeia_(constellation)',
    stars: [[-4,-1.5],[-2,1.5],[0,-1.5],[2,1.5],[4,-1.5]],
    lines: [[0,1],[1,2],[2,3],[3,4]]
  },
  {
    name: 'Centaurus',
    wikiKey: 'Centaurus_(constellation)',
    stars: [[0,4],[2.5,2],[4,0.5],[3,-1.5],[1,-2.5],[-1,-2.5],[-3,-1],[-2,1.5],[0.5,-0.5],[1.5,-4]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[4,9],[8,4],[8,6]]
  },
  {
    name: 'Cepheus',
    wikiKey: 'Cepheus_(constellation)',
    stars: [[0,4],[2.5,1.5],[2,-1],[0,-2.5],[-2,-1],[-2.5,1.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,3]]
  },
  {
    name: 'Cetus',
    wikiKey: 'Cetus',
    stars: [[-4,2],[-2,3.5],[0.5,3],[2,1],[3,-0.5],[1,-2.5],[-1,-3],[-3.5,-1.5],[-0.5,-0.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,2]]
  },
  {
    name: 'Chamaeleon',
    wikiKey: 'Chamaeleon_(constellation)',
    stars: [[-2.5,0],[0,1],[2.5,0],[0,-1]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Circinus',
    wikiKey: 'Circinus_(constellation)',
    stars: [[0,2],[1.5,-1],[-1.5,-1]],
    lines: [[0,1],[1,2],[2,0]]
  },
  {
    name: 'Columba',
    wikiKey: 'Columba_(constellation)',
    stars: [[0,1],[2,0.5],[3.5,-0.5],[-2,0],[-3,1.5]],
    lines: [[4,3],[3,0],[0,1],[1,2]]
  },
  {
    name: 'Coma Berenices',
    wikiKey: 'Coma_Berenices',
    stars: [[-1,2.5],[1.5,0.5],[0,-2]],
    lines: [[0,1],[1,2]]
  },
  {
    name: 'Corona Australis',
    wikiKey: 'Corona_Australis',
    stars: [[-3,0],[-1.5,1.5],[0,2],[1.5,1.5],[3,0],[2,-1.5],[0,-2]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]
  },
  {
    name: 'Corona Borealis',
    wikiKey: 'Corona_Borealis',
    stars: [[-3.5,0],[-2,2],[0,2.5],[2,2],[3.5,0],[2.5,-1.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5]]
  },
  {
    name: 'Corvus',
    wikiKey: 'Corvus_(constellation)',
    stars: [[-2,1.5],[0,2.5],[2,1.5],[2,-1.5],[0,-2]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,0]]
  },
  {
    name: 'Crater',
    wikiKey: 'Crater_(constellation)',
    stars: [[-2,1],[0,2.5],[2,1],[2.5,-1],[0,-2],[-2.5,-1]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]
  },
  {
    name: 'Crux',
    wikiKey: 'Crux',
    stars: [[0,3],[0,-3],[-2.5,0],[2.5,0]],
    lines: [[0,1],[2,3]]
  },
  {
    name: 'Cygnus',
    wikiKey: 'Cygnus_(constellation)',
    stars: [[0,4.5],[0,2],[0,0],[-3.5,0],[3.5,0],[0,-3.5]],
    lines: [[0,1],[1,2],[2,3],[2,4],[2,5]]
  },
  {
    name: 'Delphinus',
    wikiKey: 'Delphinus',
    stars: [[-1.5,1.5],[0,2.5],[1.5,1.5],[1.5,-0.5],[-1.5,-0.5],[0,-3]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,0],[3,5]]
  },
  {
    name: 'Dorado',
    wikiKey: 'Dorado_(constellation)',
    stars: [[0,2.5],[2,0],[0,-2],[-2,0]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Draco',
    wikiKey: 'Draco_(constellation)',
    stars: [[1,5],[3,3],[2,1],[3.5,-0.5],[2,-2.5],[0,-3.5],[-2,-2],[-3.5,0],[-1,2]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,2]]
  },
  {
    name: 'Equuleus',
    wikiKey: 'Equuleus',
    stars: [[-1,1],[1,1],[1,-1],[-1,-1]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Eridanus',
    wikiKey: 'Eridanus_(constellation)',
    stars: [[2,5],[1,3],[0,1],[-2,-0.5],[-1,-2.5],[1,-3.5],[3,-2.5],[4,-0.5],[3,1.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]]
  },
  {
    name: 'Fornax',
    wikiKey: 'Fornax',
    stars: [[-2,0.5],[0,1.5],[2,0.5],[1.5,-1.5]],
    lines: [[0,1],[1,2],[2,3]]
  },
  {
    name: 'Gemini',
    wikiKey: 'Gemini_(constellation)',
    stars: [[-2,4],[2,4],[-2,2],[2,2],[-2,0],[2,0],[-2,-2],[2,-2],[-2,-4],[2,-4]],
    lines: [[0,2],[2,4],[4,6],[6,8],[1,3],[3,5],[5,7],[7,9],[0,1]]
  },
  {
    name: 'Grus',
    wikiKey: 'Grus_(constellation)',
    stars: [[0,4],[0,2],[0,0],[-2.5,-1.5],[2.5,-1.5],[0,-4]],
    lines: [[0,1],[1,2],[2,3],[2,4],[2,5]]
  },
  {
    name: 'Hercules',
    wikiKey: 'Hercules_(constellation)',
    stars: [[0,4.5],[-2.5,2.5],[2.5,2.5],[-2.5,0.5],[2.5,0.5],[-3.5,-2],[3.5,-2],[-1,-3],[1,-3]],
    lines: [[0,1],[0,2],[1,2],[1,3],[2,4],[3,4],[3,5],[4,6],[5,7],[6,8],[7,8]]
  },
  {
    name: 'Horologium',
    wikiKey: 'Horologium_(constellation)',
    stars: [[0,3],[1.5,0],[0,-3],[-1.5,0]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Hydra',
    wikiKey: 'Hydra_(constellation)',
    stars: [[-5,1.5],[-3,2.5],[-1,2],[0.5,0.5],[2,-0.5],[4,-1],[5,-2]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]
  },
  {
    name: 'Hydrus',
    wikiKey: 'Hydrus',
    stars: [[0,3],[2.5,0],[0,-3],[-2.5,0]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Indus',
    wikiKey: 'Indus_(constellation)',
    stars: [[-1.5,1.5],[0,2.5],[1.5,1.5],[0,-2]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Lacerta',
    wikiKey: 'Lacerta',
    stars: [[-2.5,2],[-1.5,1],[0,2],[1.5,1],[2.5,2],[1.5,-1],[0,-2.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[3,5],[5,6]]
  },
  {
    name: 'Leo',
    wikiKey: 'Leo_(constellation)',
    stars: [[-1,4],[-2,2.5],[-3,1],[-2,-0.5],[-0.5,-1.5],[1.5,-1.5],[3,-0.5],[3.5,2]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[0,7]]
  },
  {
    name: 'Leo Minor',
    wikiKey: 'Leo_Minor',
    stars: [[-3,0.5],[0,1.5],[3,0.5],[1,-1.5]],
    lines: [[0,1],[1,2],[2,3]]
  },
  {
    name: 'Lepus',
    wikiKey: 'Lepus_(constellation)',
    stars: [[-2.5,1],[0,2.5],[2.5,1],[2.5,-1.5],[0,-2.5],[-2.5,-1.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]
  },
  {
    name: 'Libra',
    wikiKey: 'Libra_(constellation)',
    stars: [[0,2.5],[-2.5,0],[2.5,0],[-1.5,-2.5],[1.5,-2.5]],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,4],[1,2]]
  },
  {
    name: 'Lupus',
    wikiKey: 'Lupus_(constellation)',
    stars: [[-2.5,2.5],[0,3.5],[2.5,2],[2.5,0],[0,-1.5],[-2.5,-2.5],[0,-3.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[4,6],[0,4]]
  },
  {
    name: 'Lynx',
    wikiKey: 'Lynx_(constellation)',
    stars: [[-5,2],[-3,1],[0,2],[2,1],[4.5,0.5],[4,-2]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5]]
  },
  {
    name: 'Lyra',
    wikiKey: 'Lyra_(constellation)',
    stars: [[0,3],[-1.5,1],[1.5,1],[-1.5,-1.5],[1.5,-1.5]],
    lines: [[0,1],[0,2],[1,2],[1,3],[2,4],[3,4]]
  },
  {
    name: 'Mensa',
    wikiKey: 'Mensa_(constellation)',
    stars: [[-2,1.5],[0,2],[2,1],[1.5,-1.5],[-1.5,-1]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,0]]
  },
  {
    name: 'Microscopium',
    wikiKey: 'Microscopium',
    stars: [[-1.5,1.5],[1.5,1.5],[1.5,-1.5],[-1.5,-1.5]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Monoceros',
    wikiKey: 'Monoceros',
    stars: [[-3.5,1],[-1.5,2],[0.5,0.5],[2.5,1.5],[3.5,-1]],
    lines: [[0,1],[1,2],[2,3],[3,4]]
  },
  {
    name: 'Musca',
    wikiKey: 'Musca',
    stars: [[-2.5,0],[0,1.5],[2.5,0],[0,-1.5]],
    lines: [[0,1],[1,2],[2,3],[3,0],[0,2]]
  },
  {
    name: 'Norma',
    wikiKey: 'Norma_(constellation)',
    stars: [[-1.5,1.5],[1.5,1.5],[1.5,-1.5],[-1.5,-1.5]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Octans',
    wikiKey: 'Octans',
    stars: [[-3,1],[3,2],[2,-2.5]],
    lines: [[0,1],[1,2],[2,0]]
  },
  {
    name: 'Ophiuchus',
    wikiKey: 'Ophiuchus',
    stars: [[0,4.5],[-3.5,2.5],[3.5,2.5],[-4,-1],[4,-1],[-2.5,-3],[2.5,-3]],
    lines: [[0,1],[0,2],[1,3],[2,4],[1,2],[3,5],[4,6],[5,6]]
  },
  {
    name: 'Orion',
    wikiKey: 'Orion_(constellation)',
    stars: [[-2,3.5],[2,3.5],[-3.5,1],[3.5,1],[-1.5,0],[0,0],[1.5,0],[-2,-2.5],[2,-2.5]],
    lines: [[0,2],[0,4],[1,3],[1,5],[2,7],[3,8],[4,5],[5,6],[6,5],[7,6]]
  },
  {
    name: 'Pavo',
    wikiKey: 'Pavo_(constellation)',
    stars: [[0,4],[-2.5,1.5],[2.5,1.5],[0,0],[-2.5,-2.5],[2.5,-2.5],[0,-4]],
    lines: [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,6],[5,6]]
  },
  {
    name: 'Pegasus',
    wikiKey: 'Pegasus_(constellation)',
    stars: [[-3.5,3],[3.5,3],[3.5,-3],[-3.5,-3],[-3.5,5],[3.5,5]],
    lines: [[0,1],[1,2],[2,3],[3,0],[0,4],[1,5]]
  },
  {
    name: 'Perseus',
    wikiKey: 'Perseus_(constellation)',
    stars: [[0,4],[1.5,2],[0,0.5],[-2.5,-0.5],[2.5,-0.5],[0,-2.5],[-3.5,-1.5]],
    lines: [[0,1],[1,2],[2,3],[2,4],[3,5],[4,5],[3,6]]
  },
  {
    name: 'Phoenix',
    wikiKey: 'Phoenix_(constellation)',
    stars: [[0,3.5],[-2.5,1.5],[2.5,1.5],[0,0],[-2.5,-2],[2.5,-2]],
    lines: [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,5]]
  },
  {
    name: 'Pictor',
    wikiKey: 'Pictor',
    stars: [[-2.5,0],[0,1],[2.5,0]],
    lines: [[0,1],[1,2]]
  },
  {
    name: 'Pisces',
    wikiKey: 'Pisces_(constellation)',
    stars: [[-4.5,0],[-3,1.5],[0,2.5],[3,1.5],[4.5,0],[3.5,-2],[1,-3],[-1,-3],[-3.5,-2]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,0],[2,8]]
  },
  {
    name: 'Piscis Austrinus',
    wikiKey: 'Piscis_Austrinus',
    stars: [[0,2.5],[2.5,1],[2.5,-1],[0,-2.5],[-2.5,-1],[-2.5,1]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]
  },
  {
    name: 'Puppis',
    wikiKey: 'Puppis',
    stars: [[-2.5,3.5],[0,2.5],[2.5,1.5],[3.5,-1],[1,-2.5],[-1,-3.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5]]
  },
  {
    name: 'Pyxis',
    wikiKey: 'Pyxis',
    stars: [[0,2.5],[0,0],[0,-2.5]],
    lines: [[0,1],[1,2]]
  },
  {
    name: 'Reticulum',
    wikiKey: 'Reticulum',
    stars: [[-1.5,1.5],[1.5,1.5],[1.5,-1.5],[-1.5,-1.5]],
    lines: [[0,1],[1,2],[2,3],[3,0],[0,2]]
  },
  {
    name: 'Sagitta',
    wikiKey: 'Sagitta',
    stars: [[-3.5,0],[0,0],[3.5,0],[1.5,1.5],[1.5,-1.5]],
    lines: [[0,1],[1,2],[2,3],[2,4]]
  },
  {
    name: 'Sagittarius',
    wikiKey: 'Sagittarius_(constellation)',
    stars: [[-3.5,2],[-1.5,3.5],[1,2.5],[3,2.5],[3.5,0.5],[1.5,-1],[-1,-2],[-3.5,-0.5],[0.5,0.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[8,3],[8,5]]
  },
  {
    name: 'Scorpius',
    wikiKey: 'Scorpius',
    stars: [[0,4.5],[0,3],[-1.5,1.5],[1.5,1.5],[0,0.5],[0,-1],[0,-2.5],[1,-3.5],[2.5,-4],[2,-5]],
    lines: [[0,1],[1,2],[1,3],[2,4],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]]
  },
  {
    name: 'Sculptor',
    wikiKey: 'Sculptor_(constellation)',
    stars: [[-2.5,1.5],[0,2.5],[2.5,1.5],[2,-1.5],[0,-1]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,0]]
  },
  {
    name: 'Scutum',
    wikiKey: 'Scutum_(constellation)',
    stars: [[-1.5,2],[1.5,2],[1.5,-2],[-1.5,-2]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Serpens',
    wikiKey: 'Serpens',
    stars: [[-4.5,2],[-2.5,1],[0,2],[2.5,1],[4.5,2],[4.5,0],[3.5,-2]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]
  },
  {
    name: 'Sextans',
    wikiKey: 'Sextans_(constellation)',
    stars: [[-2.5,1.5],[0,0],[2.5,1.5],[0,-2.5]],
    lines: [[0,1],[1,2],[1,3]]
  },
  {
    name: 'Taurus',
    wikiKey: 'Taurus_(constellation)',
    stars: [[0,0.5],[-3.5,1.5],[-2.5,3.5],[1,2.5],[2.5,3.5],[3.5,1.5],[4.5,0.5]],
    lines: [[0,1],[1,2],[0,3],[3,4],[0,5],[5,6]]
  },
  {
    name: 'Telescopium',
    wikiKey: 'Telescopium_(constellation)',
    stars: [[0,2.5],[2,-0.5],[0,-2.5],[-2,-0.5]],
    lines: [[0,1],[1,2],[2,3],[3,0]]
  },
  {
    name: 'Triangulum',
    wikiKey: 'Triangulum_(constellation)',
    stars: [[0,3],[2.5,-2],[-2.5,-2]],
    lines: [[0,1],[1,2],[2,0]]
  },
  {
    name: 'Triangulum Australe',
    wikiKey: 'Triangulum_Australe',
    stars: [[0,3],[3,-2],[-3,-2]],
    lines: [[0,1],[1,2],[2,0]]
  },
  {
    name: 'Tucana',
    wikiKey: 'Tucana_(constellation)',
    stars: [[0,2.5],[2.5,0.5],[2,-2],[-0.5,-2.5],[-2.5,-0.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,0]]
  },
  {
    name: 'Ursa Major',
    wikiKey: 'Ursa_Major',
    stars: [[-5,2.5],[-3,3.5],[-1,3.5],[1,2.5],[3,3.5],[5,2.5],[4.5,0.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[3,6]]
  },
  {
    name: 'Ursa Minor',
    wikiKey: 'Ursa_Minor',
    stars: [[4.5,-2],[2.5,-1],[0.5,0],[-1,2],[-0.5,3.5],[-1.5,4.5],[1,4.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,4]]
  },
  {
    name: 'Vela',
    wikiKey: 'Vela_(constellation)',
    stars: [[-3.5,2],[-1,3.5],[1.5,2.5],[3.5,1],[3.5,-1.5],[1,-2.5],[-1.5,-2],[-3.5,-0.5]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]]
  },
  {
    name: 'Virgo',
    wikiKey: 'Virgo_(constellation)',
    stars: [[0,4.5],[-3,2.5],[3,2.5],[-2.5,0.5],[2.5,0.5],[-3.5,-2],[3.5,-2],[0,-1]],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,7]]
  },
  {
    name: 'Volans',
    wikiKey: 'Volans',
    stars: [[-2.5,1],[0,2.5],[2.5,1],[2.5,-1],[0,-2],[-2.5,-1]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]
  },
  {
    name: 'Vulpecula',
    wikiKey: 'Vulpecula',
    stars: [[-3,0],[0,0.8],[3,0]],
    lines: [[0,1],[1,2]]
  }
];
