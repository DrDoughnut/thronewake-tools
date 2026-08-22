// Thronewake Building Catalog
// Data extracted and adapted for Thronewake Tools

export interface BuildingLevel {
  level: number;
  time: number | null;
  wood: number;
  clay: number;
  iron: number;
  crop: number;
  pop: number;
  cp: number;
  effects: Record<string, number | null>;
}

export type PrerequisiteType = string;

export interface Prerequisite {
  type: PrerequisiteType;
  gid?: number | number[];
  level?: number;
  vid?: number[];
  [key: string]: unknown;
}

export interface CatalogBuilding {
  gid: number;
  slug: string;
  name: string;
  category: string;
  maxLevel: number;
  cultureBase: number;
  effects: string[];
  prerequisites: Prerequisite[];
  levels: BuildingLevel[];
}

export const FACTION_TRIBE_MAP: Record<string, number> = {
  embermark_dominion: 1,
  stormfang_clans: 2,
  vaeloria: 3,
};

export const BUILDINGS: CatalogBuilding[] = [
  {
    "gid": 1,
    "slug": "woodcutter",
    "name": "Woodcutter",
    "category": "Resources",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "production1"
    ],
    "prerequisites": [
      {
        "type": "Level11CapitalOrCity"
      },
      {
        "type": "Level13Capital"
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 260,
        "wood": 40,
        "clay": 100,
        "iron": 50,
        "crop": 60,
        "pop": 2,
        "cp": 1,
        "effects": {
          "production1": 5
        }
      },
      {
        "level": 2,
        "time": 616,
        "wood": 65,
        "clay": 165,
        "iron": 85,
        "crop": 100,
        "pop": 3,
        "cp": 1,
        "effects": {
          "production1": 9
        }
      },
      {
        "level": 3,
        "time": 1186,
        "wood": 110,
        "clay": 280,
        "iron": 140,
        "crop": 165,
        "pop": 4,
        "cp": 2,
        "effects": {
          "production1": 15
        }
      },
      {
        "level": 4,
        "time": 2097,
        "wood": 185,
        "clay": 465,
        "iron": 235,
        "crop": 280,
        "pop": 5,
        "cp": 2,
        "effects": {
          "production1": 22
        }
      },
      {
        "level": 5,
        "time": 3555,
        "wood": 310,
        "clay": 780,
        "iron": 390,
        "crop": 465,
        "pop": 6,
        "cp": 2,
        "effects": {
          "production1": 33
        }
      },
      {
        "level": 6,
        "time": 5888,
        "wood": 520,
        "clay": 1300,
        "iron": 650,
        "crop": 780,
        "pop": 8,
        "cp": 3,
        "effects": {
          "production1": 50
        }
      },
      {
        "level": 7,
        "time": 9621,
        "wood": 870,
        "clay": 2170,
        "iron": 1085,
        "crop": 1300,
        "pop": 10,
        "cp": 4,
        "effects": {
          "production1": 70
        }
      },
      {
        "level": 8,
        "time": 15594,
        "wood": 1450,
        "clay": 3625,
        "iron": 1810,
        "crop": 2175,
        "pop": 12,
        "cp": 4,
        "effects": {
          "production1": 100
        }
      },
      {
        "level": 9,
        "time": 25150,
        "wood": 2420,
        "clay": 6050,
        "iron": 3025,
        "crop": 3630,
        "pop": 14,
        "cp": 5,
        "effects": {
          "production1": 145
        }
      },
      {
        "level": 10,
        "time": 40440,
        "wood": 4040,
        "clay": 10105,
        "iron": 5050,
        "crop": 6060,
        "pop": 16,
        "cp": 6,
        "effects": {
          "production1": 200
        }
      },
      {
        "level": 11,
        "time": 64904,
        "wood": 6750,
        "clay": 16870,
        "iron": 8435,
        "crop": 10125,
        "pop": 18,
        "cp": 7,
        "effects": {
          "production1": 280
        }
      },
      {
        "level": 12,
        "time": 104047,
        "wood": 11270,
        "clay": 28175,
        "iron": 14090,
        "crop": 16905,
        "pop": 20,
        "cp": 9,
        "effects": {
          "production1": 375
        }
      },
      {
        "level": 13,
        "time": 166675,
        "wood": 18820,
        "clay": 47055,
        "iron": 23525,
        "crop": 28230,
        "pop": 22,
        "cp": 11,
        "effects": {
          "production1": 495
        }
      },
      {
        "level": 14,
        "time": 266880,
        "wood": 31430,
        "clay": 78580,
        "iron": 39290,
        "crop": 47150,
        "pop": 24,
        "cp": 13,
        "effects": {
          "production1": 635
        }
      },
      {
        "level": 15,
        "time": 427208,
        "wood": 52490,
        "clay": 131230,
        "iron": 65615,
        "crop": 78740,
        "pop": 26,
        "cp": 15,
        "effects": {
          "production1": 800
        }
      },
      {
        "level": 16,
        "time": 683733,
        "wood": 87660,
        "clay": 219155,
        "iron": 109575,
        "crop": 131490,
        "pop": 29,
        "cp": 18,
        "effects": {
          "production1": 1000
        }
      },
      {
        "level": 17,
        "time": 1094173,
        "wood": 146395,
        "clay": 365985,
        "iron": 182995,
        "crop": 219590,
        "pop": 32,
        "cp": 22,
        "effects": {
          "production1": 1300
        }
      },
      {
        "level": 18,
        "time": 1750878,
        "wood": 244480,
        "clay": 611195,
        "iron": 305600,
        "crop": 366715,
        "pop": 35,
        "cp": 27,
        "effects": {
          "production1": 1600
        }
      },
      {
        "level": 19,
        "time": 2801604,
        "wood": 408280,
        "clay": 1020695,
        "iron": 510350,
        "crop": 612420,
        "pop": 38,
        "cp": 32,
        "effects": {
          "production1": 2000
        }
      },
      {
        "level": 20,
        "time": 4482767,
        "wood": 681825,
        "clay": 1704565,
        "iron": 852280,
        "crop": 1022740,
        "pop": 41,
        "cp": 38,
        "effects": {
          "production1": 2500
        }
      }
    ]
  },
  {
    "gid": 2,
    "slug": "clay-pit",
    "name": "Clay Pit",
    "category": "Resources",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "production2"
    ],
    "prerequisites": [
      {
        "type": "Level11CapitalOrCity"
      },
      {
        "type": "Level13Capital"
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 220,
        "wood": 80,
        "clay": 40,
        "iron": 80,
        "crop": 50,
        "pop": 2,
        "cp": 1,
        "effects": {
          "production2": 5
        }
      },
      {
        "level": 2,
        "time": 552,
        "wood": 135,
        "clay": 65,
        "iron": 135,
        "crop": 85,
        "pop": 3,
        "cp": 1,
        "effects": {
          "production2": 9
        }
      },
      {
        "level": 3,
        "time": 1083,
        "wood": 225,
        "clay": 110,
        "iron": 225,
        "crop": 140,
        "pop": 4,
        "cp": 2,
        "effects": {
          "production2": 15
        }
      },
      {
        "level": 4,
        "time": 1933,
        "wood": 375,
        "clay": 185,
        "iron": 375,
        "crop": 235,
        "pop": 5,
        "cp": 2,
        "effects": {
          "production2": 22
        }
      },
      {
        "level": 5,
        "time": 3293,
        "wood": 620,
        "clay": 310,
        "iron": 620,
        "crop": 390,
        "pop": 6,
        "cp": 2,
        "effects": {
          "production2": 33
        }
      },
      {
        "level": 6,
        "time": 5469,
        "wood": 1040,
        "clay": 520,
        "iron": 1040,
        "crop": 650,
        "pop": 8,
        "cp": 3,
        "effects": {
          "production2": 50
        }
      },
      {
        "level": 7,
        "time": 8950,
        "wood": 1735,
        "clay": 870,
        "iron": 1735,
        "crop": 1085,
        "pop": 10,
        "cp": 4,
        "effects": {
          "production2": 70
        }
      },
      {
        "level": 8,
        "time": 14520,
        "wood": 2900,
        "clay": 1450,
        "iron": 2900,
        "crop": 1810,
        "pop": 12,
        "cp": 4,
        "effects": {
          "production2": 100
        }
      },
      {
        "level": 9,
        "time": 23432,
        "wood": 4840,
        "clay": 2420,
        "iron": 4840,
        "crop": 3025,
        "pop": 14,
        "cp": 5,
        "effects": {
          "production2": 145
        }
      },
      {
        "level": 10,
        "time": 37691,
        "wood": 8080,
        "clay": 4040,
        "iron": 8080,
        "crop": 5050,
        "pop": 16,
        "cp": 6,
        "effects": {
          "production2": 200
        }
      },
      {
        "level": 11,
        "time": 60506,
        "wood": 13500,
        "clay": 6750,
        "iron": 13500,
        "crop": 8435,
        "pop": 18,
        "cp": 7,
        "effects": {
          "production2": 280
        }
      },
      {
        "level": 12,
        "time": 97010,
        "wood": 22540,
        "clay": 11270,
        "iron": 22540,
        "crop": 14090,
        "pop": 20,
        "cp": 9,
        "effects": {
          "production2": 375
        }
      },
      {
        "level": 13,
        "time": 155416,
        "wood": 37645,
        "clay": 18820,
        "iron": 37645,
        "crop": 23525,
        "pop": 22,
        "cp": 11,
        "effects": {
          "production2": 495
        }
      },
      {
        "level": 14,
        "time": 248866,
        "wood": 62865,
        "clay": 31430,
        "iron": 62865,
        "crop": 39290,
        "pop": 24,
        "cp": 13,
        "effects": {
          "production2": 635
        }
      },
      {
        "level": 15,
        "time": 398385,
        "wood": 104985,
        "clay": 52490,
        "iron": 104985,
        "crop": 65615,
        "pop": 26,
        "cp": 15,
        "effects": {
          "production2": 800
        }
      },
      {
        "level": 16,
        "time": 637617,
        "wood": 175320,
        "clay": 87660,
        "iron": 175320,
        "crop": 109575,
        "pop": 29,
        "cp": 18,
        "effects": {
          "production2": 1000
        }
      },
      {
        "level": 17,
        "time": 1020387,
        "wood": 292790,
        "clay": 146395,
        "iron": 292790,
        "crop": 182995,
        "pop": 32,
        "cp": 22,
        "effects": {
          "production2": 1300
        }
      },
      {
        "level": 18,
        "time": 1632818,
        "wood": 488955,
        "clay": 244480,
        "iron": 488955,
        "crop": 305600,
        "pop": 35,
        "cp": 27,
        "effects": {
          "production2": 1600
        }
      },
      {
        "level": 19,
        "time": 2612709,
        "wood": 816555,
        "clay": 408280,
        "iron": 816555,
        "crop": 510350,
        "pop": 38,
        "cp": 32,
        "effects": {
          "production2": 2000
        }
      },
      {
        "level": 20,
        "time": 4180535,
        "wood": 1363650,
        "clay": 681825,
        "iron": 1363650,
        "crop": 852280,
        "pop": 41,
        "cp": 38,
        "effects": {
          "production2": 2500
        }
      }
    ]
  },
  {
    "gid": 3,
    "slug": "iron-mine",
    "name": "Iron Mine",
    "category": "Resources",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "production3"
    ],
    "prerequisites": [
      {
        "type": "Level11CapitalOrCity"
      },
      {
        "type": "Level13Capital"
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 450,
        "wood": 100,
        "clay": 80,
        "iron": 30,
        "crop": 60,
        "pop": 3,
        "cp": 1,
        "effects": {
          "production3": 5
        }
      },
      {
        "level": 2,
        "time": 920,
        "wood": 165,
        "clay": 135,
        "iron": 50,
        "crop": 100,
        "pop": 5,
        "cp": 1,
        "effects": {
          "production3": 9
        }
      },
      {
        "level": 3,
        "time": 1672,
        "wood": 280,
        "clay": 225,
        "iron": 85,
        "crop": 165,
        "pop": 7,
        "cp": 2,
        "effects": {
          "production3": 15
        }
      },
      {
        "level": 4,
        "time": 2875,
        "wood": 465,
        "clay": 375,
        "iron": 140,
        "crop": 280,
        "pop": 9,
        "cp": 2,
        "effects": {
          "production3": 22
        }
      },
      {
        "level": 5,
        "time": 4800,
        "wood": 780,
        "clay": 620,
        "iron": 235,
        "crop": 465,
        "pop": 11,
        "cp": 2,
        "effects": {
          "production3": 33
        }
      },
      {
        "level": 6,
        "time": 7881,
        "wood": 1300,
        "clay": 1040,
        "iron": 390,
        "crop": 780,
        "pop": 13,
        "cp": 3,
        "effects": {
          "production3": 50
        }
      },
      {
        "level": 7,
        "time": 12809,
        "wood": 2170,
        "clay": 1735,
        "iron": 650,
        "crop": 1300,
        "pop": 15,
        "cp": 4,
        "effects": {
          "production3": 70
        }
      },
      {
        "level": 8,
        "time": 20694,
        "wood": 3625,
        "clay": 2900,
        "iron": 1085,
        "crop": 2175,
        "pop": 17,
        "cp": 4,
        "effects": {
          "production3": 100
        }
      },
      {
        "level": 9,
        "time": 33311,
        "wood": 6050,
        "clay": 4840,
        "iron": 1815,
        "crop": 3630,
        "pop": 19,
        "cp": 5,
        "effects": {
          "production3": 145
        }
      },
      {
        "level": 10,
        "time": 53497,
        "wood": 10105,
        "clay": 8080,
        "iron": 3030,
        "crop": 6060,
        "pop": 21,
        "cp": 6,
        "effects": {
          "production3": 200
        }
      },
      {
        "level": 11,
        "time": 85795,
        "wood": 16870,
        "clay": 13500,
        "iron": 5060,
        "crop": 10125,
        "pop": 24,
        "cp": 7,
        "effects": {
          "production3": 280
        }
      },
      {
        "level": 12,
        "time": 137472,
        "wood": 28175,
        "clay": 22540,
        "iron": 8455,
        "crop": 16905,
        "pop": 27,
        "cp": 9,
        "effects": {
          "production3": 375
        }
      },
      {
        "level": 13,
        "time": 220155,
        "wood": 47055,
        "clay": 37645,
        "iron": 14115,
        "crop": 28230,
        "pop": 30,
        "cp": 11,
        "effects": {
          "production3": 495
        }
      },
      {
        "level": 14,
        "time": 352449,
        "wood": 78580,
        "clay": 62865,
        "iron": 23575,
        "crop": 47150,
        "pop": 33,
        "cp": 13,
        "effects": {
          "production3": 635
        }
      },
      {
        "level": 15,
        "time": 564118,
        "wood": 131230,
        "clay": 104985,
        "iron": 39370,
        "crop": 78740,
        "pop": 36,
        "cp": 15,
        "effects": {
          "production3": 800
        }
      },
      {
        "level": 16,
        "time": 902789,
        "wood": 219155,
        "clay": 175320,
        "iron": 65745,
        "crop": 131490,
        "pop": 39,
        "cp": 18,
        "effects": {
          "production3": 1000
        }
      },
      {
        "level": 17,
        "time": 1444662,
        "wood": 365985,
        "clay": 292790,
        "iron": 109795,
        "crop": 219590,
        "pop": 42,
        "cp": 22,
        "effects": {
          "production3": 1300
        }
      },
      {
        "level": 18,
        "time": 2311659,
        "wood": 611195,
        "clay": 488955,
        "iron": 183360,
        "crop": 366715,
        "pop": 45,
        "cp": 27,
        "effects": {
          "production3": 1600
        }
      },
      {
        "level": 19,
        "time": 3698854,
        "wood": 1020695,
        "clay": 816555,
        "iron": 306210,
        "crop": 612420,
        "pop": 48,
        "cp": 32,
        "effects": {
          "production3": 2000
        }
      },
      {
        "level": 20,
        "time": 5918366,
        "wood": 1704565,
        "clay": 1363650,
        "iron": 511370,
        "crop": 1022740,
        "pop": 51,
        "cp": 38,
        "effects": {
          "production3": 2500
        }
      }
    ]
  },
  {
    "gid": 4,
    "slug": "cropland",
    "name": "Cropland",
    "category": "Resources",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "production4"
    ],
    "prerequisites": [
      {
        "type": "Level11CapitalOrCity"
      },
      {
        "type": "Level13Capital"
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 150,
        "wood": 75,
        "clay": 90,
        "iron": 85,
        "crop": 0,
        "pop": 0,
        "cp": 1,
        "effects": {
          "production4": 5
        }
      },
      {
        "level": 2,
        "time": 440,
        "wood": 125,
        "clay": 150,
        "iron": 140,
        "crop": 0,
        "pop": 0,
        "cp": 1,
        "effects": {
          "production4": 9
        }
      },
      {
        "level": 3,
        "time": 904,
        "wood": 210,
        "clay": 250,
        "iron": 235,
        "crop": 0,
        "pop": 0,
        "cp": 2,
        "effects": {
          "production4": 15
        }
      },
      {
        "level": 4,
        "time": 1646,
        "wood": 350,
        "clay": 420,
        "iron": 395,
        "crop": 0,
        "pop": 0,
        "cp": 2,
        "effects": {
          "production4": 22
        }
      },
      {
        "level": 5,
        "time": 2834,
        "wood": 585,
        "clay": 700,
        "iron": 660,
        "crop": 0,
        "pop": 0,
        "cp": 2,
        "effects": {
          "production4": 33
        }
      },
      {
        "level": 6,
        "time": 4735,
        "wood": 975,
        "clay": 1170,
        "iron": 1105,
        "crop": 0,
        "pop": 1,
        "cp": 3,
        "effects": {
          "production4": 50
        }
      },
      {
        "level": 7,
        "time": 7776,
        "wood": 1625,
        "clay": 1950,
        "iron": 1845,
        "crop": 0,
        "pop": 2,
        "cp": 4,
        "effects": {
          "production4": 70
        }
      },
      {
        "level": 8,
        "time": 12641,
        "wood": 2715,
        "clay": 3260,
        "iron": 3080,
        "crop": 0,
        "pop": 3,
        "cp": 4,
        "effects": {
          "production4": 100
        }
      },
      {
        "level": 9,
        "time": 20426,
        "wood": 4535,
        "clay": 5445,
        "iron": 5140,
        "crop": 0,
        "pop": 4,
        "cp": 5,
        "effects": {
          "production4": 145
        }
      },
      {
        "level": 10,
        "time": 32881,
        "wood": 7575,
        "clay": 9095,
        "iron": 8590,
        "crop": 0,
        "pop": 5,
        "cp": 6,
        "effects": {
          "production4": 200
        }
      },
      {
        "level": 11,
        "time": 52810,
        "wood": 12655,
        "clay": 15185,
        "iron": 14340,
        "crop": 0,
        "pop": 6,
        "cp": 7,
        "effects": {
          "production4": 280
        }
      },
      {
        "level": 12,
        "time": 84696,
        "wood": 21130,
        "clay": 25360,
        "iron": 23950,
        "crop": 0,
        "pop": 7,
        "cp": 9,
        "effects": {
          "production4": 375
        }
      },
      {
        "level": 13,
        "time": 135713,
        "wood": 35290,
        "clay": 42350,
        "iron": 39995,
        "crop": 0,
        "pop": 8,
        "cp": 11,
        "effects": {
          "production4": 495
        }
      },
      {
        "level": 14,
        "time": 217341,
        "wood": 58935,
        "clay": 70720,
        "iron": 66795,
        "crop": 0,
        "pop": 9,
        "cp": 13,
        "effects": {
          "production4": 635
        }
      },
      {
        "level": 15,
        "time": 347945,
        "wood": 98420,
        "clay": 118105,
        "iron": 111545,
        "crop": 0,
        "pop": 10,
        "cp": 15,
        "effects": {
          "production4": 800
        }
      },
      {
        "level": 16,
        "time": 556912,
        "wood": 164365,
        "clay": 197240,
        "iron": 186280,
        "crop": 0,
        "pop": 12,
        "cp": 18,
        "effects": {
          "production4": 1000
        }
      },
      {
        "level": 17,
        "time": 891259,
        "wood": 274490,
        "clay": 329385,
        "iron": 311085,
        "crop": 0,
        "pop": 14,
        "cp": 22,
        "effects": {
          "production4": 1300
        }
      },
      {
        "level": 18,
        "time": 1426215,
        "wood": 458395,
        "clay": 550075,
        "iron": 519515,
        "crop": 0,
        "pop": 16,
        "cp": 27,
        "effects": {
          "production4": 1600
        }
      },
      {
        "level": 19,
        "time": 2282144,
        "wood": 765520,
        "clay": 918625,
        "iron": 867590,
        "crop": 0,
        "pop": 18,
        "cp": 32,
        "effects": {
          "production4": 2000
        }
      },
      {
        "level": 20,
        "time": 3651630,
        "wood": 1278420,
        "clay": 1534105,
        "iron": 1448880,
        "crop": 0,
        "pop": 20,
        "cp": 38,
        "effects": {
          "production4": 2500
        }
      }
    ]
  },
  {
    "gid": 5,
    "slug": "sawmill",
    "name": "Sawmill",
    "category": "Resources",
    "maxLevel": 5,
    "cultureBase": 1,
    "effects": [
      "productionBoost1"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          1
        ],
        "level": 10
      },
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 5
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 3000,
        "wood": 520,
        "clay": 380,
        "iron": 290,
        "crop": 90,
        "pop": 4,
        "cp": 1,
        "effects": {
          "productionBoost1": 0.05
        }
      },
      {
        "level": 2,
        "time": 5700,
        "wood": 935,
        "clay": 685,
        "iron": 520,
        "crop": 160,
        "pop": 6,
        "cp": 1,
        "effects": {
          "productionBoost1": 0.1
        }
      },
      {
        "level": 3,
        "time": 9750,
        "wood": 1685,
        "clay": 1230,
        "iron": 940,
        "crop": 290,
        "pop": 8,
        "cp": 2,
        "effects": {
          "productionBoost1": 0.15
        }
      },
      {
        "level": 4,
        "time": 15825,
        "wood": 3035,
        "clay": 2215,
        "iron": 1690,
        "crop": 525,
        "pop": 10,
        "cp": 2,
        "effects": {
          "productionBoost1": 0.2
        }
      },
      {
        "level": 5,
        "time": 24938,
        "wood": 5460,
        "clay": 3990,
        "iron": 3045,
        "crop": 945,
        "pop": 12,
        "cp": 2,
        "effects": {
          "productionBoost1": 0.25
        }
      }
    ]
  },
  {
    "gid": 6,
    "slug": "brickyard",
    "name": "Brickyard",
    "category": "Resources",
    "maxLevel": 5,
    "cultureBase": 1,
    "effects": [
      "productionBoost2"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          2
        ],
        "level": 10
      },
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 5
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2840,
        "wood": 440,
        "clay": 480,
        "iron": 320,
        "crop": 50,
        "pop": 3,
        "cp": 1,
        "effects": {
          "productionBoost2": 0.05
        }
      },
      {
        "level": 2,
        "time": 5460,
        "wood": 790,
        "clay": 865,
        "iron": 575,
        "crop": 90,
        "pop": 5,
        "cp": 1,
        "effects": {
          "productionBoost2": 0.1
        }
      },
      {
        "level": 3,
        "time": 9390,
        "wood": 1425,
        "clay": 1555,
        "iron": 1035,
        "crop": 160,
        "pop": 7,
        "cp": 2,
        "effects": {
          "productionBoost2": 0.15
        }
      },
      {
        "level": 4,
        "time": 15285,
        "wood": 2565,
        "clay": 2800,
        "iron": 1865,
        "crop": 290,
        "pop": 9,
        "cp": 2,
        "effects": {
          "productionBoost2": 0.2
        }
      },
      {
        "level": 5,
        "time": 24128,
        "wood": 4620,
        "clay": 5040,
        "iron": 3360,
        "crop": 525,
        "pop": 11,
        "cp": 2,
        "effects": {
          "productionBoost2": 0.25
        }
      }
    ]
  },
  {
    "gid": 7,
    "slug": "iron-foundry",
    "name": "Iron Foundry",
    "category": "Resources",
    "maxLevel": 5,
    "cultureBase": 1,
    "effects": [
      "productionBoost3"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          3
        ],
        "level": 10
      },
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 5
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 4080,
        "wood": 200,
        "clay": 450,
        "iron": 510,
        "crop": 120,
        "pop": 6,
        "cp": 1,
        "effects": {
          "productionBoost3": 0.05
        }
      },
      {
        "level": 2,
        "time": 7320,
        "wood": 360,
        "clay": 810,
        "iron": 920,
        "crop": 215,
        "pop": 9,
        "cp": 1,
        "effects": {
          "productionBoost3": 0.1
        }
      },
      {
        "level": 3,
        "time": 12180,
        "wood": 650,
        "clay": 1460,
        "iron": 1650,
        "crop": 390,
        "pop": 12,
        "cp": 2,
        "effects": {
          "productionBoost3": 0.15
        }
      },
      {
        "level": 4,
        "time": 19470,
        "wood": 1165,
        "clay": 2625,
        "iron": 2975,
        "crop": 700,
        "pop": 15,
        "cp": 2,
        "effects": {
          "productionBoost3": 0.2
        }
      },
      {
        "level": 5,
        "time": 30405,
        "wood": 2100,
        "clay": 4725,
        "iron": 5355,
        "crop": 1260,
        "pop": 18,
        "cp": 2,
        "effects": {
          "productionBoost3": 0.25
        }
      }
    ]
  },
  {
    "gid": 8,
    "slug": "grain-mill",
    "name": "Grain Mill",
    "category": "Resources",
    "maxLevel": 5,
    "cultureBase": 1,
    "effects": [
      "productionBoost4"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          4
        ],
        "level": 5
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 1840,
        "wood": 500,
        "clay": 440,
        "iron": 380,
        "crop": 1240,
        "pop": 3,
        "cp": 1,
        "effects": {
          "productionBoost4": 0.05
        }
      },
      {
        "level": 2,
        "time": 3960,
        "wood": 900,
        "clay": 790,
        "iron": 685,
        "crop": 2230,
        "pop": 5,
        "cp": 1,
        "effects": {
          "productionBoost4": 0.1
        }
      },
      {
        "level": 3,
        "time": 7140,
        "wood": 1620,
        "clay": 1425,
        "iron": 1230,
        "crop": 4020,
        "pop": 7,
        "cp": 2,
        "effects": {
          "productionBoost4": 0.15
        }
      },
      {
        "level": 4,
        "time": 11910,
        "wood": 2915,
        "clay": 2565,
        "iron": 2215,
        "crop": 7230,
        "pop": 9,
        "cp": 2,
        "effects": {
          "productionBoost4": 0.2
        }
      },
      {
        "level": 5,
        "time": 19065,
        "wood": 5250,
        "clay": 4620,
        "iron": 3990,
        "crop": 13015,
        "pop": 11,
        "cp": 2,
        "effects": {
          "productionBoost4": 0.25
        }
      }
    ]
  },
  {
    "gid": 9,
    "slug": "bakery",
    "name": "Bakery",
    "category": "Resources",
    "maxLevel": 5,
    "cultureBase": 1,
    "effects": [
      "productionBoost4"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          4
        ],
        "level": 10
      },
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 5
      },
      {
        "type": "Building",
        "gid": [
          8
        ],
        "level": 5
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 3680,
        "wood": 1200,
        "clay": 1480,
        "iron": 870,
        "crop": 1600,
        "pop": 4,
        "cp": 1,
        "effects": {
          "productionBoost4": 0.05
        }
      },
      {
        "level": 2,
        "time": 6720,
        "wood": 2160,
        "clay": 2665,
        "iron": 1565,
        "crop": 2880,
        "pop": 6,
        "cp": 1,
        "effects": {
          "productionBoost4": 0.1
        }
      },
      {
        "level": 3,
        "time": 11280,
        "wood": 3890,
        "clay": 4795,
        "iron": 2820,
        "crop": 5185,
        "pop": 8,
        "cp": 2,
        "effects": {
          "productionBoost4": 0.15
        }
      },
      {
        "level": 4,
        "time": 18120,
        "wood": 7000,
        "clay": 8630,
        "iron": 5075,
        "crop": 9330,
        "pop": 10,
        "cp": 2,
        "effects": {
          "productionBoost4": 0.2
        }
      },
      {
        "level": 5,
        "time": 28380,
        "wood": 12595,
        "clay": 15535,
        "iron": 9135,
        "crop": 16795,
        "pop": 12,
        "cp": 2,
        "effects": {
          "productionBoost4": 0.25
        }
      }
    ]
  },
  {
    "gid": 10,
    "slug": "warehouse",
    "name": "Warehouse",
    "category": "Infrastructure",
    "maxLevel": 22,
    "cultureBase": 1,
    "effects": [
      "storageWarehouse"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 1
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2000,
        "wood": 140,
        "clay": 180,
        "iron": 100,
        "crop": 0,
        "pop": 1,
        "cp": 1,
        "effects": {
          "storageWarehouse": 1200
        }
      },
      {
        "level": 2,
        "time": 2620,
        "wood": 185,
        "clay": 240,
        "iron": 135,
        "crop": 0,
        "pop": 2,
        "cp": 1,
        "effects": {
          "storageWarehouse": 1700
        }
      },
      {
        "level": 3,
        "time": 3339,
        "wood": 250,
        "clay": 320,
        "iron": 175,
        "crop": 0,
        "pop": 3,
        "cp": 2,
        "effects": {
          "storageWarehouse": 2300
        }
      },
      {
        "level": 4,
        "time": 4173,
        "wood": 330,
        "clay": 425,
        "iron": 235,
        "crop": 0,
        "pop": 4,
        "cp": 2,
        "effects": {
          "storageWarehouse": 3100
        }
      },
      {
        "level": 5,
        "time": 5141,
        "wood": 440,
        "clay": 565,
        "iron": 315,
        "crop": 0,
        "pop": 5,
        "cp": 2,
        "effects": {
          "storageWarehouse": 4000
        }
      },
      {
        "level": 6,
        "time": 6264,
        "wood": 585,
        "clay": 750,
        "iron": 415,
        "crop": 0,
        "pop": 6,
        "cp": 3,
        "effects": {
          "storageWarehouse": 5000
        }
      },
      {
        "level": 7,
        "time": 7566,
        "wood": 775,
        "clay": 995,
        "iron": 555,
        "crop": 0,
        "pop": 7,
        "cp": 4,
        "effects": {
          "storageWarehouse": 6300
        }
      },
      {
        "level": 8,
        "time": 9077,
        "wood": 1030,
        "clay": 1325,
        "iron": 735,
        "crop": 0,
        "pop": 8,
        "cp": 4,
        "effects": {
          "storageWarehouse": 7700
        }
      },
      {
        "level": 9,
        "time": 10829,
        "wood": 1370,
        "clay": 1760,
        "iron": 980,
        "crop": 0,
        "pop": 9,
        "cp": 5,
        "effects": {
          "storageWarehouse": 9600
        }
      },
      {
        "level": 10,
        "time": 12861,
        "wood": 1825,
        "clay": 2345,
        "iron": 1300,
        "crop": 0,
        "pop": 10,
        "cp": 6,
        "effects": {
          "storageWarehouse": 12000
        }
      },
      {
        "level": 11,
        "time": 15219,
        "wood": 2425,
        "clay": 3115,
        "iron": 1730,
        "crop": 0,
        "pop": 12,
        "cp": 7,
        "effects": {
          "storageWarehouse": 14400
        }
      },
      {
        "level": 12,
        "time": 17954,
        "wood": 3225,
        "clay": 4145,
        "iron": 2305,
        "crop": 0,
        "pop": 14,
        "cp": 9,
        "effects": {
          "storageWarehouse": 18000
        }
      },
      {
        "level": 13,
        "time": 21127,
        "wood": 4290,
        "clay": 5515,
        "iron": 3065,
        "crop": 0,
        "pop": 16,
        "cp": 11,
        "effects": {
          "storageWarehouse": 22000
        }
      },
      {
        "level": 14,
        "time": 24807,
        "wood": 5705,
        "clay": 7335,
        "iron": 4075,
        "crop": 0,
        "pop": 18,
        "cp": 13,
        "effects": {
          "storageWarehouse": 26000
        }
      },
      {
        "level": 15,
        "time": 29077,
        "wood": 7585,
        "clay": 9755,
        "iron": 5420,
        "crop": 0,
        "pop": 20,
        "cp": 15,
        "effects": {
          "storageWarehouse": 32000
        }
      },
      {
        "level": 16,
        "time": 34029,
        "wood": 10090,
        "clay": 12975,
        "iron": 7205,
        "crop": 0,
        "pop": 22,
        "cp": 18,
        "effects": {
          "storageWarehouse": 38000
        }
      },
      {
        "level": 17,
        "time": 39774,
        "wood": 13420,
        "clay": 17255,
        "iron": 9585,
        "crop": 0,
        "pop": 24,
        "cp": 22,
        "effects": {
          "storageWarehouse": 45000
        }
      },
      {
        "level": 18,
        "time": 46437,
        "wood": 17850,
        "clay": 22950,
        "iron": 12750,
        "crop": 0,
        "pop": 26,
        "cp": 27,
        "effects": {
          "storageWarehouse": 55000
        }
      },
      {
        "level": 19,
        "time": 54167,
        "wood": 23740,
        "clay": 30520,
        "iron": 16955,
        "crop": 0,
        "pop": 28,
        "cp": 32,
        "effects": {
          "storageWarehouse": 66000
        }
      },
      {
        "level": 20,
        "time": 63134,
        "wood": 31575,
        "clay": 40595,
        "iron": 22550,
        "crop": 0,
        "pop": 30,
        "cp": 38,
        "effects": {
          "storageWarehouse": 80000
        }
      },
      {
        "level": 21,
        "time": 73535,
        "wood": 41995,
        "clay": 53990,
        "iron": 29990,
        "crop": 0,
        "pop": 32,
        "cp": 51,
        "effects": {
          "storageWarehouse": 100000
        }
      },
      {
        "level": 22,
        "time": 85601,
        "wood": 55855,
        "clay": 71805,
        "iron": 39885,
        "crop": 0,
        "pop": 34,
        "cp": 69,
        "effects": {
          "storageWarehouse": 125000
        }
      }
    ]
  },
  {
    "gid": 11,
    "slug": "granary",
    "name": "Granary",
    "category": "Infrastructure",
    "maxLevel": 22,
    "cultureBase": 1,
    "effects": [
      "storageGranary"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 1
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 1600,
        "wood": 80,
        "clay": 100,
        "iron": 70,
        "crop": 20,
        "pop": 1,
        "cp": 1,
        "effects": {
          "storageGranary": 1200
        }
      },
      {
        "level": 2,
        "time": 2156,
        "wood": 105,
        "clay": 135,
        "iron": 95,
        "crop": 25,
        "pop": 2,
        "cp": 1,
        "effects": {
          "storageGranary": 1700
        }
      },
      {
        "level": 3,
        "time": 2801,
        "wood": 140,
        "clay": 175,
        "iron": 125,
        "crop": 35,
        "pop": 3,
        "cp": 2,
        "effects": {
          "storageGranary": 2300
        }
      },
      {
        "level": 4,
        "time": 3549,
        "wood": 190,
        "clay": 235,
        "iron": 165,
        "crop": 45,
        "pop": 4,
        "cp": 2,
        "effects": {
          "storageGranary": 3100
        }
      },
      {
        "level": 5,
        "time": 4417,
        "wood": 250,
        "clay": 315,
        "iron": 220,
        "crop": 65,
        "pop": 5,
        "cp": 2,
        "effects": {
          "storageGranary": 4000
        }
      },
      {
        "level": 6,
        "time": 5424,
        "wood": 335,
        "clay": 415,
        "iron": 290,
        "crop": 85,
        "pop": 6,
        "cp": 3,
        "effects": {
          "storageGranary": 5000
        }
      },
      {
        "level": 7,
        "time": 6591,
        "wood": 445,
        "clay": 555,
        "iron": 385,
        "crop": 110,
        "pop": 7,
        "cp": 4,
        "effects": {
          "storageGranary": 6300
        }
      },
      {
        "level": 8,
        "time": 7946,
        "wood": 590,
        "clay": 735,
        "iron": 515,
        "crop": 145,
        "pop": 8,
        "cp": 4,
        "effects": {
          "storageGranary": 7700
        }
      },
      {
        "level": 9,
        "time": 9517,
        "wood": 785,
        "clay": 980,
        "iron": 685,
        "crop": 195,
        "pop": 9,
        "cp": 5,
        "effects": {
          "storageGranary": 9600
        }
      },
      {
        "level": 10,
        "time": 11340,
        "wood": 1040,
        "clay": 1300,
        "iron": 910,
        "crop": 260,
        "pop": 10,
        "cp": 6,
        "effects": {
          "storageGranary": 12000
        }
      },
      {
        "level": 11,
        "time": 13455,
        "wood": 1385,
        "clay": 1730,
        "iron": 1210,
        "crop": 345,
        "pop": 12,
        "cp": 7,
        "effects": {
          "storageGranary": 14400
        }
      },
      {
        "level": 12,
        "time": 15907,
        "wood": 1845,
        "clay": 2305,
        "iron": 1610,
        "crop": 460,
        "pop": 14,
        "cp": 9,
        "effects": {
          "storageGranary": 18000
        }
      },
      {
        "level": 13,
        "time": 18753,
        "wood": 2450,
        "clay": 3065,
        "iron": 2145,
        "crop": 615,
        "pop": 16,
        "cp": 11,
        "effects": {
          "storageGranary": 22000
        }
      },
      {
        "level": 14,
        "time": 22053,
        "wood": 3260,
        "clay": 4075,
        "iron": 2850,
        "crop": 815,
        "pop": 18,
        "cp": 13,
        "effects": {
          "storageGranary": 26000
        }
      },
      {
        "level": 15,
        "time": 25882,
        "wood": 4335,
        "clay": 5420,
        "iron": 3795,
        "crop": 1085,
        "pop": 20,
        "cp": 15,
        "effects": {
          "storageGranary": 32000
        }
      },
      {
        "level": 16,
        "time": 30323,
        "wood": 5765,
        "clay": 7205,
        "iron": 5045,
        "crop": 1440,
        "pop": 22,
        "cp": 18,
        "effects": {
          "storageGranary": 38000
        }
      },
      {
        "level": 17,
        "time": 35474,
        "wood": 7670,
        "clay": 9585,
        "iron": 6710,
        "crop": 1915,
        "pop": 24,
        "cp": 22,
        "effects": {
          "storageGranary": 45000
        }
      },
      {
        "level": 18,
        "time": 41450,
        "wood": 10200,
        "clay": 12750,
        "iron": 8925,
        "crop": 2550,
        "pop": 26,
        "cp": 27,
        "effects": {
          "storageGranary": 55000
        }
      },
      {
        "level": 19,
        "time": 48382,
        "wood": 13565,
        "clay": 16955,
        "iron": 11870,
        "crop": 3390,
        "pop": 28,
        "cp": 32,
        "effects": {
          "storageGranary": 66000
        }
      },
      {
        "level": 20,
        "time": 56423,
        "wood": 18040,
        "clay": 22550,
        "iron": 15785,
        "crop": 4510,
        "pop": 30,
        "cp": 38,
        "effects": {
          "storageGranary": 80000
        }
      },
      {
        "level": 21,
        "time": 65751,
        "wood": 23995,
        "clay": 29990,
        "iron": 20995,
        "crop": 6000,
        "pop": 32,
        "cp": 51,
        "effects": {
          "storageGranary": 100000
        }
      },
      {
        "level": 22,
        "time": 76571,
        "wood": 31915,
        "clay": 39885,
        "iron": 27925,
        "crop": 7980,
        "pop": 34,
        "cp": 69,
        "effects": {
          "storageGranary": 125000
        }
      }
    ]
  },
  {
    "gid": 13,
    "slug": "smithy",
    "name": "Smithy",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 2,
    "effects": [],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 3
      },
      {
        "type": "Building",
        "gid": [
          22
        ],
        "level": 1
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2000,
        "wood": 180,
        "clay": 250,
        "iron": 500,
        "crop": 160,
        "pop": 4,
        "cp": 2,
        "effects": {}
      },
      {
        "level": 2,
        "time": 2620,
        "wood": 230,
        "clay": 320,
        "iron": 640,
        "crop": 205,
        "pop": 6,
        "cp": 3,
        "effects": {}
      },
      {
        "level": 3,
        "time": 3339,
        "wood": 295,
        "clay": 410,
        "iron": 820,
        "crop": 260,
        "pop": 8,
        "cp": 3,
        "effects": {}
      },
      {
        "level": 4,
        "time": 4173,
        "wood": 375,
        "clay": 525,
        "iron": 1050,
        "crop": 335,
        "pop": 10,
        "cp": 4,
        "effects": {}
      },
      {
        "level": 5,
        "time": 5141,
        "wood": 485,
        "clay": 670,
        "iron": 1340,
        "crop": 430,
        "pop": 12,
        "cp": 5,
        "effects": {}
      },
      {
        "level": 6,
        "time": 6264,
        "wood": 620,
        "clay": 860,
        "iron": 1720,
        "crop": 550,
        "pop": 15,
        "cp": 6,
        "effects": {}
      },
      {
        "level": 7,
        "time": 7566,
        "wood": 790,
        "clay": 1100,
        "iron": 2200,
        "crop": 705,
        "pop": 18,
        "cp": 7,
        "effects": {}
      },
      {
        "level": 8,
        "time": 9077,
        "wood": 1015,
        "clay": 1405,
        "iron": 2815,
        "crop": 900,
        "pop": 21,
        "cp": 9,
        "effects": {}
      },
      {
        "level": 9,
        "time": 10829,
        "wood": 1295,
        "clay": 1800,
        "iron": 3605,
        "crop": 1155,
        "pop": 24,
        "cp": 10,
        "effects": {}
      },
      {
        "level": 10,
        "time": 12861,
        "wood": 1660,
        "clay": 2305,
        "iron": 4610,
        "crop": 1475,
        "pop": 27,
        "cp": 12,
        "effects": {}
      },
      {
        "level": 11,
        "time": 15219,
        "wood": 2125,
        "clay": 2950,
        "iron": 5905,
        "crop": 1890,
        "pop": 30,
        "cp": 15,
        "effects": {}
      },
      {
        "level": 12,
        "time": 17954,
        "wood": 2720,
        "clay": 3780,
        "iron": 7555,
        "crop": 2420,
        "pop": 33,
        "cp": 18,
        "effects": {}
      },
      {
        "level": 13,
        "time": 21127,
        "wood": 3480,
        "clay": 4835,
        "iron": 9670,
        "crop": 3095,
        "pop": 36,
        "cp": 21,
        "effects": {}
      },
      {
        "level": 14,
        "time": 24807,
        "wood": 4455,
        "clay": 6190,
        "iron": 12380,
        "crop": 3960,
        "pop": 39,
        "cp": 26,
        "effects": {}
      },
      {
        "level": 15,
        "time": 29077,
        "wood": 5705,
        "clay": 7925,
        "iron": 15845,
        "crop": 5070,
        "pop": 42,
        "cp": 31,
        "effects": {}
      },
      {
        "level": 16,
        "time": 34029,
        "wood": 7300,
        "clay": 10140,
        "iron": 20280,
        "crop": 6490,
        "pop": 46,
        "cp": 37,
        "effects": {}
      },
      {
        "level": 17,
        "time": 39774,
        "wood": 9345,
        "clay": 12980,
        "iron": 25960,
        "crop": 8310,
        "pop": 50,
        "cp": 44,
        "effects": {}
      },
      {
        "level": 18,
        "time": 46437,
        "wood": 11965,
        "clay": 16615,
        "iron": 33230,
        "crop": 10635,
        "pop": 54,
        "cp": 53,
        "effects": {}
      },
      {
        "level": 19,
        "time": 54167,
        "wood": 15315,
        "clay": 21270,
        "iron": 42535,
        "crop": 13610,
        "pop": 58,
        "cp": 64,
        "effects": {}
      },
      {
        "level": 20,
        "time": 63134,
        "wood": 19600,
        "clay": 27225,
        "iron": 54445,
        "crop": 17420,
        "pop": 62,
        "cp": 77,
        "effects": {}
      }
    ]
  },
  {
    "gid": 14,
    "slug": "tournament-square",
    "name": "Bannerfield",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "troopSpeedBoost"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          16
        ],
        "level": 15
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 3500,
        "wood": 1750,
        "clay": 2250,
        "iron": 1530,
        "crop": 240,
        "pop": 1,
        "cp": 1,
        "effects": {
          "troopSpeedBoost": 0.1
        }
      },
      {
        "level": 2,
        "time": 4360,
        "wood": 2240,
        "clay": 2880,
        "iron": 1960,
        "crop": 305,
        "pop": 2,
        "cp": 1,
        "effects": {
          "troopSpeedBoost": 0.2
        }
      },
      {
        "level": 3,
        "time": 5358,
        "wood": 2865,
        "clay": 3685,
        "iron": 2505,
        "crop": 395,
        "pop": 3,
        "cp": 2,
        "effects": {
          "troopSpeedBoost": 0.3
        }
      },
      {
        "level": 4,
        "time": 6515,
        "wood": 3670,
        "clay": 4720,
        "iron": 3210,
        "crop": 505,
        "pop": 4,
        "cp": 2,
        "effects": {
          "troopSpeedBoost": 0.4
        }
      },
      {
        "level": 5,
        "time": 7857,
        "wood": 4700,
        "clay": 6040,
        "iron": 4105,
        "crop": 645,
        "pop": 5,
        "cp": 2,
        "effects": {
          "troopSpeedBoost": 0.5
        }
      },
      {
        "level": 6,
        "time": 9414,
        "wood": 6015,
        "clay": 7730,
        "iron": 5255,
        "crop": 825,
        "pop": 6,
        "cp": 3,
        "effects": {
          "troopSpeedBoost": 0.6
        }
      },
      {
        "level": 7,
        "time": 11221,
        "wood": 7695,
        "clay": 9895,
        "iron": 6730,
        "crop": 1055,
        "pop": 7,
        "cp": 4,
        "effects": {
          "troopSpeedBoost": 0.7
        }
      },
      {
        "level": 8,
        "time": 13316,
        "wood": 9850,
        "clay": 12665,
        "iron": 8615,
        "crop": 1350,
        "pop": 8,
        "cp": 4,
        "effects": {
          "troopSpeedBoost": 0.8
        }
      },
      {
        "level": 9,
        "time": 15746,
        "wood": 12610,
        "clay": 16215,
        "iron": 11025,
        "crop": 1730,
        "pop": 9,
        "cp": 5,
        "effects": {
          "troopSpeedBoost": 0.9
        }
      },
      {
        "level": 10,
        "time": 18566,
        "wood": 16140,
        "clay": 20755,
        "iron": 14110,
        "crop": 2215,
        "pop": 10,
        "cp": 6,
        "effects": {
          "troopSpeedBoost": 1
        }
      },
      {
        "level": 11,
        "time": 21836,
        "wood": 20660,
        "clay": 26565,
        "iron": 18065,
        "crop": 2835,
        "pop": 12,
        "cp": 7,
        "effects": {
          "troopSpeedBoost": 1.1
        }
      },
      {
        "level": 12,
        "time": 25630,
        "wood": 26445,
        "clay": 34000,
        "iron": 23120,
        "crop": 3625,
        "pop": 14,
        "cp": 9,
        "effects": {
          "troopSpeedBoost": 1.2
        }
      },
      {
        "level": 13,
        "time": 30031,
        "wood": 33850,
        "clay": 43520,
        "iron": 29595,
        "crop": 4640,
        "pop": 16,
        "cp": 11,
        "effects": {
          "troopSpeedBoost": 1.3
        }
      },
      {
        "level": 14,
        "time": 35136,
        "wood": 43330,
        "clay": 55705,
        "iron": 37880,
        "crop": 5940,
        "pop": 18,
        "cp": 13,
        "effects": {
          "troopSpeedBoost": 1.4
        }
      },
      {
        "level": 15,
        "time": 41058,
        "wood": 55460,
        "clay": 71305,
        "iron": 48490,
        "crop": 7605,
        "pop": 20,
        "cp": 15,
        "effects": {
          "troopSpeedBoost": 1.5
        }
      },
      {
        "level": 16,
        "time": 47927,
        "wood": 70990,
        "clay": 91270,
        "iron": 62065,
        "crop": 9735,
        "pop": 22,
        "cp": 18,
        "effects": {
          "troopSpeedBoost": 1.6
        }
      },
      {
        "level": 17,
        "time": 55896,
        "wood": 90865,
        "clay": 116825,
        "iron": 79440,
        "crop": 12460,
        "pop": 24,
        "cp": 22,
        "effects": {
          "troopSpeedBoost": 1.7
        }
      },
      {
        "level": 18,
        "time": 65139,
        "wood": 116305,
        "clay": 149540,
        "iron": 101685,
        "crop": 15950,
        "pop": 26,
        "cp": 27,
        "effects": {
          "troopSpeedBoost": 1.8
        }
      },
      {
        "level": 19,
        "time": 75861,
        "wood": 148875,
        "clay": 191410,
        "iron": 130160,
        "crop": 20415,
        "pop": 28,
        "cp": 32,
        "effects": {
          "troopSpeedBoost": 1.9
        }
      },
      {
        "level": 20,
        "time": 88299,
        "wood": 190560,
        "clay": 245005,
        "iron": 166600,
        "crop": 26135,
        "pop": 30,
        "cp": 38,
        "effects": {
          "troopSpeedBoost": 2
        }
      }
    ]
  },
  {
    "gid": 15,
    "slug": "town-hall",
    "name": "Town Hall",
    "category": "Infrastructure",
    "maxLevel": 22,
    "cultureBase": 2,
    "effects": [
      "buildingTime"
    ],
    "prerequisites": [],
    "levels": [
      {
        "level": 1,
        "time": 2000,
        "wood": 70,
        "clay": 40,
        "iron": 60,
        "crop": 20,
        "pop": 2,
        "cp": 2,
        "effects": {
          "buildingTime": 1
        }
      },
      {
        "level": 2,
        "time": 2620,
        "wood": 95,
        "clay": 55,
        "iron": 80,
        "crop": 25,
        "pop": 3,
        "cp": 3,
        "effects": {
          "buildingTime": 0.964
        }
      },
      {
        "level": 3,
        "time": 3339,
        "wood": 125,
        "clay": 70,
        "iron": 105,
        "crop": 35,
        "pop": 4,
        "cp": 3,
        "effects": {
          "buildingTime": 0.9292959999999999
        }
      },
      {
        "level": 4,
        "time": 4173,
        "wood": 165,
        "clay": 95,
        "iron": 140,
        "crop": 45,
        "pop": 5,
        "cp": 4,
        "effects": {
          "buildingTime": 0.8958413439999999
        }
      },
      {
        "level": 5,
        "time": 5141,
        "wood": 220,
        "clay": 125,
        "iron": 190,
        "crop": 65,
        "pop": 6,
        "cp": 5,
        "effects": {
          "buildingTime": 0.8635910556159999
        }
      },
      {
        "level": 6,
        "time": 6264,
        "wood": 290,
        "clay": 165,
        "iron": 250,
        "crop": 85,
        "pop": 8,
        "cp": 6,
        "effects": {
          "buildingTime": 0.8325017776138239
        }
      },
      {
        "level": 7,
        "time": 7566,
        "wood": 385,
        "clay": 220,
        "iron": 330,
        "crop": 110,
        "pop": 10,
        "cp": 7,
        "effects": {
          "buildingTime": 0.8025317136197262
        }
      },
      {
        "level": 8,
        "time": 9077,
        "wood": 515,
        "clay": 295,
        "iron": 440,
        "crop": 145,
        "pop": 12,
        "cp": 9,
        "effects": {
          "buildingTime": 0.773640571929416
        }
      },
      {
        "level": 9,
        "time": 10829,
        "wood": 685,
        "clay": 390,
        "iron": 585,
        "crop": 195,
        "pop": 14,
        "cp": 10,
        "effects": {
          "buildingTime": 0.7457895113399571
        }
      },
      {
        "level": 10,
        "time": 12861,
        "wood": 910,
        "clay": 520,
        "iron": 780,
        "crop": 260,
        "pop": 16,
        "cp": 12,
        "effects": {
          "buildingTime": 0.7189410889317185
        }
      },
      {
        "level": 11,
        "time": 15219,
        "wood": 1210,
        "clay": 695,
        "iron": 1040,
        "crop": 345,
        "pop": 18,
        "cp": 15,
        "effects": {
          "buildingTime": 0.6930592097301767
        }
      },
      {
        "level": 12,
        "time": 17954,
        "wood": 1610,
        "clay": 920,
        "iron": 1380,
        "crop": 460,
        "pop": 20,
        "cp": 18,
        "effects": {
          "buildingTime": 0.6681090781798903
        }
      },
      {
        "level": 13,
        "time": 21127,
        "wood": 2145,
        "clay": 1225,
        "iron": 1840,
        "crop": 615,
        "pop": 22,
        "cp": 21,
        "effects": {
          "buildingTime": 0.6440571513654142
        }
      },
      {
        "level": 14,
        "time": 24807,
        "wood": 2850,
        "clay": 1630,
        "iron": 2445,
        "crop": 815,
        "pop": 24,
        "cp": 26,
        "effects": {
          "buildingTime": 0.6208710939162593
        }
      },
      {
        "level": 15,
        "time": 29077,
        "wood": 3795,
        "clay": 2170,
        "iron": 3250,
        "crop": 1085,
        "pop": 26,
        "cp": 31,
        "effects": {
          "buildingTime": 0.598519734535274
        }
      },
      {
        "level": 16,
        "time": 34029,
        "wood": 5045,
        "clay": 2885,
        "iron": 4325,
        "crop": 1440,
        "pop": 29,
        "cp": 37,
        "effects": {
          "buildingTime": 0.576973024092004
        }
      },
      {
        "level": 17,
        "time": 39774,
        "wood": 6710,
        "clay": 3835,
        "iron": 5750,
        "crop": 1915,
        "pop": 32,
        "cp": 44,
        "effects": {
          "buildingTime": 0.5562019952246918
        }
      },
      {
        "level": 18,
        "time": 46437,
        "wood": 8925,
        "clay": 5100,
        "iron": 7650,
        "crop": 2550,
        "pop": 35,
        "cp": 53,
        "effects": {
          "buildingTime": 0.5361787233966029
        }
      },
      {
        "level": 19,
        "time": 54167,
        "wood": 11870,
        "clay": 6780,
        "iron": 10175,
        "crop": 3390,
        "pop": 38,
        "cp": 64,
        "effects": {
          "buildingTime": 0.5168762893543252
        }
      },
      {
        "level": 20,
        "time": 63134,
        "wood": 15785,
        "clay": 9020,
        "iron": 13530,
        "crop": 4510,
        "pop": 41,
        "cp": 77,
        "effects": {
          "buildingTime": 0.4982687429375695
        }
      },
      {
        "level": 21,
        "time": 73535,
        "wood": 97000,
        "clay": 86130,
        "iron": 97775,
        "crop": 46560,
        "pop": 43,
        "cp": 102,
        "effects": {
          "buildingTime": 0.480331
        }
      },
      {
        "level": 22,
        "time": 85601,
        "wood": 124160,
        "clay": 110250,
        "iron": 125150,
        "crop": 59600,
        "pop": 46,
        "cp": 138,
        "effects": {
          "buildingTime": 0.463039
        }
      }
    ]
  },
  {
    "gid": 16,
    "slug": "rally-point",
    "name": "Rally Point",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "troopVisibility"
    ],
    "prerequisites": [],
    "levels": [
      {
        "level": 1,
        "time": 2000,
        "wood": 110,
        "clay": 160,
        "iron": 90,
        "crop": 70,
        "pop": 1,
        "cp": 1,
        "effects": {
          "troopVisibility": 0
        }
      },
      {
        "level": 2,
        "time": 2620,
        "wood": 145,
        "clay": 215,
        "iron": 120,
        "crop": 95,
        "pop": 2,
        "cp": 1,
        "effects": {
          "troopVisibility": 1
        }
      },
      {
        "level": 3,
        "time": 3339,
        "wood": 195,
        "clay": 285,
        "iron": 160,
        "crop": 125,
        "pop": 3,
        "cp": 2,
        "effects": {
          "troopVisibility": 2
        }
      },
      {
        "level": 4,
        "time": 4173,
        "wood": 260,
        "clay": 375,
        "iron": 210,
        "crop": 165,
        "pop": 4,
        "cp": 2,
        "effects": {
          "troopVisibility": 3
        }
      },
      {
        "level": 5,
        "time": 5141,
        "wood": 345,
        "clay": 500,
        "iron": 280,
        "crop": 220,
        "pop": 5,
        "cp": 2,
        "effects": {
          "troopVisibility": 4
        }
      },
      {
        "level": 6,
        "time": 6264,
        "wood": 460,
        "clay": 665,
        "iron": 375,
        "crop": 290,
        "pop": 6,
        "cp": 3,
        "effects": {
          "troopVisibility": 5
        }
      },
      {
        "level": 7,
        "time": 7566,
        "wood": 610,
        "clay": 885,
        "iron": 500,
        "crop": 385,
        "pop": 7,
        "cp": 4,
        "effects": {
          "troopVisibility": 6
        }
      },
      {
        "level": 8,
        "time": 9077,
        "wood": 810,
        "clay": 1180,
        "iron": 665,
        "crop": 515,
        "pop": 8,
        "cp": 4,
        "effects": {
          "troopVisibility": 7
        }
      },
      {
        "level": 9,
        "time": 10829,
        "wood": 1075,
        "clay": 1565,
        "iron": 880,
        "crop": 685,
        "pop": 9,
        "cp": 5,
        "effects": {
          "troopVisibility": 8
        }
      },
      {
        "level": 10,
        "time": 12861,
        "wood": 1430,
        "clay": 2085,
        "iron": 1170,
        "crop": 910,
        "pop": 10,
        "cp": 6,
        "effects": {
          "troopVisibility": 9
        }
      },
      {
        "level": 11,
        "time": 15219,
        "wood": 1905,
        "clay": 2770,
        "iron": 1560,
        "crop": 1210,
        "pop": 12,
        "cp": 7,
        "effects": {
          "troopVisibility": 10
        }
      },
      {
        "level": 12,
        "time": 17954,
        "wood": 2535,
        "clay": 3685,
        "iron": 2075,
        "crop": 1610,
        "pop": 14,
        "cp": 9,
        "effects": {
          "troopVisibility": 11
        }
      },
      {
        "level": 13,
        "time": 21127,
        "wood": 3370,
        "clay": 4900,
        "iron": 2755,
        "crop": 2145,
        "pop": 16,
        "cp": 11,
        "effects": {
          "troopVisibility": 12
        }
      },
      {
        "level": 14,
        "time": 24807,
        "wood": 4480,
        "clay": 6520,
        "iron": 3665,
        "crop": 2850,
        "pop": 18,
        "cp": 13,
        "effects": {
          "troopVisibility": 13
        }
      },
      {
        "level": 15,
        "time": 29077,
        "wood": 5960,
        "clay": 8670,
        "iron": 4875,
        "crop": 3795,
        "pop": 20,
        "cp": 15,
        "effects": {
          "troopVisibility": 14
        }
      },
      {
        "level": 16,
        "time": 34029,
        "wood": 7930,
        "clay": 11530,
        "iron": 6485,
        "crop": 5045,
        "pop": 22,
        "cp": 18,
        "effects": {
          "troopVisibility": 15
        }
      },
      {
        "level": 17,
        "time": 39774,
        "wood": 10545,
        "clay": 15335,
        "iron": 8625,
        "crop": 6710,
        "pop": 24,
        "cp": 22,
        "effects": {
          "troopVisibility": 16
        }
      },
      {
        "level": 18,
        "time": 46437,
        "wood": 14025,
        "clay": 20400,
        "iron": 11475,
        "crop": 8925,
        "pop": 26,
        "cp": 27,
        "effects": {
          "troopVisibility": 17
        }
      },
      {
        "level": 19,
        "time": 54167,
        "wood": 18650,
        "clay": 27130,
        "iron": 15260,
        "crop": 11870,
        "pop": 28,
        "cp": 32,
        "effects": {
          "troopVisibility": 18
        }
      },
      {
        "level": 20,
        "time": 63134,
        "wood": 24805,
        "clay": 36085,
        "iron": 20295,
        "crop": 15785,
        "pop": 30,
        "cp": 38,
        "effects": {
          "troopVisibility": 19
        }
      }
    ]
  },
  {
    "gid": 17,
    "slug": "marketplace",
    "name": "Marketplace",
    "category": "Infrastructure",
    "maxLevel": 20,
    "cultureBase": 3,
    "effects": [
      "merchants"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 3
      },
      {
        "type": "Building",
        "gid": [
          10,
          38
        ],
        "level": 1
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 1800,
        "wood": 80,
        "clay": 70,
        "iron": 120,
        "crop": 70,
        "pop": 4,
        "cp": 4,
        "effects": {
          "merchants": 1
        }
      },
      {
        "level": 2,
        "time": 2388,
        "wood": 100,
        "clay": 90,
        "iron": 155,
        "crop": 90,
        "pop": 6,
        "cp": 4,
        "effects": {
          "merchants": 2
        }
      },
      {
        "level": 3,
        "time": 3070,
        "wood": 130,
        "clay": 115,
        "iron": 195,
        "crop": 115,
        "pop": 8,
        "cp": 5,
        "effects": {
          "merchants": 3
        }
      },
      {
        "level": 4,
        "time": 3861,
        "wood": 170,
        "clay": 145,
        "iron": 250,
        "crop": 145,
        "pop": 10,
        "cp": 6,
        "effects": {
          "merchants": 4
        }
      },
      {
        "level": 5,
        "time": 4779,
        "wood": 215,
        "clay": 190,
        "iron": 320,
        "crop": 190,
        "pop": 12,
        "cp": 7,
        "effects": {
          "merchants": 5
        }
      },
      {
        "level": 6,
        "time": 5844,
        "wood": 275,
        "clay": 240,
        "iron": 410,
        "crop": 240,
        "pop": 15,
        "cp": 9,
        "effects": {
          "merchants": 6
        }
      },
      {
        "level": 7,
        "time": 7079,
        "wood": 350,
        "clay": 310,
        "iron": 530,
        "crop": 310,
        "pop": 18,
        "cp": 11,
        "effects": {
          "merchants": 7
        }
      },
      {
        "level": 8,
        "time": 8511,
        "wood": 450,
        "clay": 395,
        "iron": 675,
        "crop": 395,
        "pop": 21,
        "cp": 13,
        "effects": {
          "merchants": 8
        }
      },
      {
        "level": 9,
        "time": 10173,
        "wood": 575,
        "clay": 505,
        "iron": 865,
        "crop": 505,
        "pop": 24,
        "cp": 15,
        "effects": {
          "merchants": 9
        }
      },
      {
        "level": 10,
        "time": 12101,
        "wood": 740,
        "clay": 645,
        "iron": 1105,
        "crop": 645,
        "pop": 27,
        "cp": 19,
        "effects": {
          "merchants": 10
        }
      },
      {
        "level": 11,
        "time": 14337,
        "wood": 945,
        "clay": 825,
        "iron": 1415,
        "crop": 825,
        "pop": 30,
        "cp": 22,
        "effects": {
          "merchants": 11
        }
      },
      {
        "level": 12,
        "time": 16931,
        "wood": 1210,
        "clay": 1060,
        "iron": 1815,
        "crop": 1060,
        "pop": 33,
        "cp": 27,
        "effects": {
          "merchants": 12
        }
      },
      {
        "level": 13,
        "time": 19940,
        "wood": 1545,
        "clay": 1355,
        "iron": 2320,
        "crop": 1355,
        "pop": 36,
        "cp": 32,
        "effects": {
          "merchants": 13
        }
      },
      {
        "level": 14,
        "time": 23430,
        "wood": 1980,
        "clay": 1735,
        "iron": 2970,
        "crop": 1735,
        "pop": 39,
        "cp": 39,
        "effects": {
          "merchants": 14
        }
      },
      {
        "level": 15,
        "time": 27479,
        "wood": 2535,
        "clay": 2220,
        "iron": 3805,
        "crop": 2220,
        "pop": 42,
        "cp": 46,
        "effects": {
          "merchants": 15
        }
      },
      {
        "level": 16,
        "time": 32176,
        "wood": 3245,
        "clay": 2840,
        "iron": 4870,
        "crop": 2840,
        "pop": 46,
        "cp": 55,
        "effects": {
          "merchants": 16
        }
      },
      {
        "level": 17,
        "time": 37624,
        "wood": 4155,
        "clay": 3635,
        "iron": 6230,
        "crop": 3635,
        "pop": 50,
        "cp": 67,
        "effects": {
          "merchants": 17
        }
      },
      {
        "level": 18,
        "time": 43944,
        "wood": 5315,
        "clay": 4650,
        "iron": 7975,
        "crop": 4650,
        "pop": 54,
        "cp": 80,
        "effects": {
          "merchants": 18
        }
      },
      {
        "level": 19,
        "time": 51275,
        "wood": 6805,
        "clay": 5955,
        "iron": 10210,
        "crop": 5955,
        "pop": 58,
        "cp": 96,
        "effects": {
          "merchants": 19
        }
      },
      {
        "level": 20,
        "time": 59779,
        "wood": 8710,
        "clay": 7620,
        "iron": 13065,
        "crop": 7620,
        "pop": 62,
        "cp": 115,
        "effects": {
          "merchants": 20
        }
      }
    ]
  },
  {
    "gid": 18,
    "slug": "embassy",
    "name": "Embassy",
    "category": "Infrastructure",
    "maxLevel": 20,
    "cultureBase": 4,
    "effects": [
      "oases"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 1
      }
    ],
    "levels": [
      {
        "level": 1,
        "wood": 180,
        "clay": 130,
        "iron": 150,
        "crop": 80,
        "pop": 3,
        "cp": 5,
        "time": 2000,
        "effects": {}
      },
      {
        "level": 2,
        "wood": 230,
        "clay": 165,
        "iron": 190,
        "crop": 100,
        "pop": 5,
        "cp": 6,
        "time": 2620,
        "effects": {}
      },
      {
        "level": 3,
        "wood": 295,
        "clay": 215,
        "iron": 245,
        "crop": 130,
        "pop": 7,
        "cp": 7,
        "time": 3339,
        "effects": {}
      },
      {
        "level": 4,
        "wood": 375,
        "clay": 275,
        "iron": 315,
        "crop": 170,
        "pop": 9,
        "cp": 8,
        "time": 4173,
        "effects": {}
      },
      {
        "level": 5,
        "wood": 485,
        "clay": 350,
        "iron": 405,
        "crop": 215,
        "pop": 11,
        "cp": 10,
        "time": 5141,
        "effects": {}
      },
      {
        "level": 6,
        "wood": 620,
        "clay": 445,
        "iron": 515,
        "crop": 275,
        "pop": 13,
        "cp": 12,
        "time": 6264,
        "effects": {}
      },
      {
        "level": 7,
        "wood": 790,
        "clay": 570,
        "iron": 660,
        "crop": 350,
        "pop": 15,
        "cp": 14,
        "time": 7566,
        "effects": {}
      },
      {
        "level": 8,
        "wood": 1015,
        "clay": 730,
        "iron": 845,
        "crop": 450,
        "pop": 17,
        "cp": 17,
        "time": 9077,
        "effects": {}
      },
      {
        "level": 9,
        "wood": 1295,
        "clay": 935,
        "iron": 1080,
        "crop": 575,
        "pop": 19,
        "cp": 21,
        "time": 10829,
        "effects": {}
      },
      {
        "level": 10,
        "wood": 1660,
        "clay": 1200,
        "iron": 1385,
        "crop": 740,
        "pop": 21,
        "cp": 25,
        "time": 12861,
        "effects": {}
      },
      {
        "level": 11,
        "wood": 2125,
        "clay": 1535,
        "iron": 1770,
        "crop": 945,
        "pop": 24,
        "cp": 30,
        "time": 15219,
        "effects": {}
      },
      {
        "level": 12,
        "wood": 2720,
        "clay": 1965,
        "iron": 2265,
        "crop": 1210,
        "pop": 27,
        "cp": 36,
        "time": 17954,
        "effects": {}
      },
      {
        "level": 13,
        "wood": 3480,
        "clay": 2515,
        "iron": 2900,
        "crop": 1545,
        "pop": 30,
        "cp": 43,
        "time": 21127,
        "effects": {}
      },
      {
        "level": 14,
        "wood": 4455,
        "clay": 3220,
        "iron": 3715,
        "crop": 1980,
        "pop": 33,
        "cp": 51,
        "time": 24807,
        "effects": {}
      },
      {
        "level": 15,
        "wood": 5705,
        "clay": 4120,
        "iron": 4755,
        "crop": 2535,
        "pop": 36,
        "cp": 62,
        "time": 29077,
        "effects": {}
      },
      {
        "level": 16,
        "wood": 7300,
        "clay": 5275,
        "iron": 6085,
        "crop": 3245,
        "pop": 39,
        "cp": 74,
        "time": 34029,
        "effects": {}
      },
      {
        "level": 17,
        "wood": 9345,
        "clay": 6750,
        "iron": 7790,
        "crop": 4155,
        "pop": 42,
        "cp": 89,
        "time": 39774,
        "effects": {}
      },
      {
        "level": 18,
        "wood": 11965,
        "clay": 8640,
        "iron": 9970,
        "crop": 5315,
        "pop": 45,
        "cp": 106,
        "time": 46437,
        "effects": {}
      },
      {
        "level": 19,
        "wood": 15315,
        "clay": 11060,
        "iron": 12760,
        "crop": 6805,
        "pop": 48,
        "cp": 128,
        "time": 54167,
        "effects": {}
      },
      {
        "level": 20,
        "wood": 19600,
        "clay": 14155,
        "iron": 16335,
        "crop": 8710,
        "pop": 51,
        "cp": 153,
        "time": 63134,
        "effects": {}
      }
    ]
  },
  {
    "gid": 19,
    "slug": "barracks",
    "name": "Barracks",
    "category": "Military",
    "maxLevel": 22,
    "cultureBase": 1,
    "effects": [
      "trainingTimeBarracks"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 3
      },
      {
        "type": "Building",
        "gid": [
          16
        ],
        "level": 1
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2000,
        "wood": 210,
        "clay": 140,
        "iron": 260,
        "crop": 120,
        "pop": 4,
        "cp": 1,
        "effects": {
          "trainingTimeBarracks": 1
        }
      },
      {
        "level": 2,
        "time": 2620,
        "wood": 280,
        "clay": 185,
        "iron": 345,
        "crop": 160,
        "pop": 6,
        "cp": 1,
        "effects": {
          "trainingTimeBarracks": 0.9
        }
      },
      {
        "level": 3,
        "time": 3339,
        "wood": 370,
        "clay": 250,
        "iron": 460,
        "crop": 210,
        "pop": 8,
        "cp": 2,
        "effects": {
          "trainingTimeBarracks": 0.81
        }
      },
      {
        "level": 4,
        "time": 4173,
        "wood": 495,
        "clay": 330,
        "iron": 610,
        "crop": 280,
        "pop": 10,
        "cp": 2,
        "effects": {
          "trainingTimeBarracks": 0.7290000000000001
        }
      },
      {
        "level": 5,
        "time": 5141,
        "wood": 655,
        "clay": 440,
        "iron": 815,
        "crop": 375,
        "pop": 12,
        "cp": 2,
        "effects": {
          "trainingTimeBarracks": 0.6561000000000001
        }
      },
      {
        "level": 6,
        "time": 6264,
        "wood": 875,
        "clay": 585,
        "iron": 1080,
        "crop": 500,
        "pop": 15,
        "cp": 3,
        "effects": {
          "trainingTimeBarracks": 0.5904900000000001
        }
      },
      {
        "level": 7,
        "time": 7566,
        "wood": 1160,
        "clay": 775,
        "iron": 1440,
        "crop": 665,
        "pop": 18,
        "cp": 4,
        "effects": {
          "trainingTimeBarracks": 0.531441
        }
      },
      {
        "level": 8,
        "time": 9077,
        "wood": 1545,
        "clay": 1030,
        "iron": 1915,
        "crop": 885,
        "pop": 21,
        "cp": 4,
        "effects": {
          "trainingTimeBarracks": 0.4782969000000001
        }
      },
      {
        "level": 9,
        "time": 10829,
        "wood": 2055,
        "clay": 1370,
        "iron": 2545,
        "crop": 1175,
        "pop": 24,
        "cp": 5,
        "effects": {
          "trainingTimeBarracks": 0.4304672100000001
        }
      },
      {
        "level": 10,
        "time": 12861,
        "wood": 2735,
        "clay": 1825,
        "iron": 3385,
        "crop": 1565,
        "pop": 27,
        "cp": 6,
        "effects": {
          "trainingTimeBarracks": 0.3874204890000001
        }
      },
      {
        "level": 11,
        "time": 15219,
        "wood": 3635,
        "clay": 2425,
        "iron": 4505,
        "crop": 2080,
        "pop": 30,
        "cp": 7,
        "effects": {
          "trainingTimeBarracks": 0.3486784401000001
        }
      },
      {
        "level": 12,
        "time": 17954,
        "wood": 4835,
        "clay": 3225,
        "iron": 5990,
        "crop": 2765,
        "pop": 33,
        "cp": 9,
        "effects": {
          "trainingTimeBarracks": 0.31381059609000006
        }
      },
      {
        "level": 13,
        "time": 21127,
        "wood": 6435,
        "clay": 4290,
        "iron": 7965,
        "crop": 3675,
        "pop": 36,
        "cp": 11,
        "effects": {
          "trainingTimeBarracks": 0.2824295364810001
        }
      },
      {
        "level": 14,
        "time": 24807,
        "wood": 8555,
        "clay": 5705,
        "iron": 10595,
        "crop": 4890,
        "pop": 39,
        "cp": 13,
        "effects": {
          "trainingTimeBarracks": 0.2541865828329001
        }
      },
      {
        "level": 15,
        "time": 29077,
        "wood": 11380,
        "clay": 7585,
        "iron": 14090,
        "crop": 6505,
        "pop": 42,
        "cp": 15,
        "effects": {
          "trainingTimeBarracks": 0.2287679245496101
        }
      },
      {
        "level": 16,
        "time": 34029,
        "wood": 15135,
        "clay": 10090,
        "iron": 18740,
        "crop": 8650,
        "pop": 46,
        "cp": 18,
        "effects": {
          "trainingTimeBarracks": 0.20589113209464907
        }
      },
      {
        "level": 17,
        "time": 39774,
        "wood": 20130,
        "clay": 13420,
        "iron": 24925,
        "crop": 11505,
        "pop": 50,
        "cp": 22,
        "effects": {
          "trainingTimeBarracks": 0.18530201888518416
        }
      },
      {
        "level": 18,
        "time": 46437,
        "wood": 26775,
        "clay": 17850,
        "iron": 33150,
        "crop": 15300,
        "pop": 54,
        "cp": 27,
        "effects": {
          "trainingTimeBarracks": 0.16677181699666577
        }
      },
      {
        "level": 19,
        "time": 54167,
        "wood": 35610,
        "clay": 23740,
        "iron": 44085,
        "crop": 20345,
        "pop": 58,
        "cp": 32,
        "effects": {
          "trainingTimeBarracks": 0.15009463529699918
        }
      },
      {
        "level": 20,
        "time": 63134,
        "wood": 47360,
        "clay": 31575,
        "iron": 58635,
        "crop": 27060,
        "pop": 62,
        "cp": 38,
        "effects": {
          "trainingTimeBarracks": 0.13508517176729928
        }
      },
      {
        "level": 21,
        "time": 73535,
        "wood": 62990,
        "clay": 41995,
        "iron": 77985,
        "crop": 35990,
        "pop": 66,
        "cp": 51,
        "effects": {
          "trainingTimeBarracks": 0.121577
        }
      },
      {
        "level": 22,
        "time": 85601,
        "wood": 83775,
        "clay": 55855,
        "iron": 103720,
        "crop": 47865,
        "pop": 70,
        "cp": 69,
        "effects": {
          "trainingTimeBarracks": 0.109419
        }
      }
    ]
  },
  {
    "gid": 20,
    "slug": "stable",
    "name": "Stable",
    "category": "Military",
    "maxLevel": 22,
    "cultureBase": 2,
    "effects": [
      "trainingTimeStable"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          13
        ],
        "level": 3
      },
      {
        "type": "Building",
        "gid": [
          22
        ],
        "level": 5
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2200,
        "wood": 260,
        "clay": 140,
        "iron": 220,
        "crop": 100,
        "pop": 5,
        "cp": 2,
        "effects": {
          "trainingTimeStable": 1
        }
      },
      {
        "level": 2,
        "time": 2852,
        "wood": 345,
        "clay": 185,
        "iron": 295,
        "crop": 135,
        "pop": 8,
        "cp": 3,
        "effects": {
          "trainingTimeStable": 0.9
        }
      },
      {
        "level": 3,
        "time": 3608,
        "wood": 460,
        "clay": 250,
        "iron": 390,
        "crop": 175,
        "pop": 11,
        "cp": 3,
        "effects": {
          "trainingTimeStable": 0.81
        }
      },
      {
        "level": 4,
        "time": 4486,
        "wood": 610,
        "clay": 330,
        "iron": 520,
        "crop": 235,
        "pop": 14,
        "cp": 4,
        "effects": {
          "trainingTimeStable": 0.7290000000000001
        }
      },
      {
        "level": 5,
        "time": 5503,
        "wood": 815,
        "clay": 440,
        "iron": 690,
        "crop": 315,
        "pop": 17,
        "cp": 5,
        "effects": {
          "trainingTimeStable": 0.6561000000000001
        }
      },
      {
        "level": 6,
        "time": 6684,
        "wood": 1080,
        "clay": 585,
        "iron": 915,
        "crop": 415,
        "pop": 20,
        "cp": 6,
        "effects": {
          "trainingTimeStable": 0.5904900000000001
        }
      },
      {
        "level": 7,
        "time": 8053,
        "wood": 1440,
        "clay": 775,
        "iron": 1220,
        "crop": 555,
        "pop": 23,
        "cp": 7,
        "effects": {
          "trainingTimeStable": 0.531441
        }
      },
      {
        "level": 8,
        "time": 9642,
        "wood": 1915,
        "clay": 1030,
        "iron": 1620,
        "crop": 735,
        "pop": 26,
        "cp": 9,
        "effects": {
          "trainingTimeStable": 0.4782969000000001
        }
      },
      {
        "level": 9,
        "time": 11485,
        "wood": 2545,
        "clay": 1370,
        "iron": 2155,
        "crop": 980,
        "pop": 29,
        "cp": 10,
        "effects": {
          "trainingTimeStable": 0.4304672100000001
        }
      },
      {
        "level": 10,
        "time": 13622,
        "wood": 3385,
        "clay": 1825,
        "iron": 2865,
        "crop": 1300,
        "pop": 32,
        "cp": 12,
        "effects": {
          "trainingTimeStable": 0.3874204890000001
        }
      },
      {
        "level": 11,
        "time": 16102,
        "wood": 4505,
        "clay": 2425,
        "iron": 3810,
        "crop": 1730,
        "pop": 36,
        "cp": 15,
        "effects": {
          "trainingTimeStable": 0.3486784401000001
        }
      },
      {
        "level": 12,
        "time": 18978,
        "wood": 5990,
        "clay": 3225,
        "iron": 5065,
        "crop": 2305,
        "pop": 40,
        "cp": 18,
        "effects": {
          "trainingTimeStable": 0.31381059609000006
        }
      },
      {
        "level": 13,
        "time": 22314,
        "wood": 7965,
        "clay": 4290,
        "iron": 6740,
        "crop": 3065,
        "pop": 44,
        "cp": 21,
        "effects": {
          "trainingTimeStable": 0.2824295364810001
        }
      },
      {
        "level": 14,
        "time": 26185,
        "wood": 10595,
        "clay": 5705,
        "iron": 8965,
        "crop": 4075,
        "pop": 48,
        "cp": 26,
        "effects": {
          "trainingTimeStable": 0.2541865828329001
        }
      },
      {
        "level": 15,
        "time": 30674,
        "wood": 14090,
        "clay": 7585,
        "iron": 11920,
        "crop": 5420,
        "pop": 52,
        "cp": 31,
        "effects": {
          "trainingTimeStable": 0.2287679245496101
        }
      },
      {
        "level": 16,
        "time": 35882,
        "wood": 18740,
        "clay": 10090,
        "iron": 15855,
        "crop": 7205,
        "pop": 56,
        "cp": 37,
        "effects": {
          "trainingTimeStable": 0.20589113209464907
        }
      },
      {
        "level": 17,
        "time": 41923,
        "wood": 24925,
        "clay": 13420,
        "iron": 21090,
        "crop": 9585,
        "pop": 60,
        "cp": 44,
        "effects": {
          "trainingTimeStable": 0.18530201888518416
        }
      },
      {
        "level": 18,
        "time": 48931,
        "wood": 33150,
        "clay": 17850,
        "iron": 28050,
        "crop": 12750,
        "pop": 64,
        "cp": 53,
        "effects": {
          "trainingTimeStable": 0.16677181699666577
        }
      },
      {
        "level": 19,
        "time": 57060,
        "wood": 44085,
        "clay": 23740,
        "iron": 37305,
        "crop": 16955,
        "pop": 68,
        "cp": 64,
        "effects": {
          "trainingTimeStable": 0.15009463529699918
        }
      },
      {
        "level": 20,
        "time": 66489,
        "wood": 58635,
        "clay": 31575,
        "iron": 49615,
        "crop": 22550,
        "pop": 72,
        "cp": 77,
        "effects": {
          "trainingTimeStable": 0.13508517176729928
        }
      },
      {
        "level": 21,
        "time": 77428,
        "wood": 77985,
        "clay": 41995,
        "iron": 65990,
        "crop": 29990,
        "pop": 76,
        "cp": 102,
        "effects": {
          "trainingTimeStable": 0.121577
        }
      },
      {
        "level": 22,
        "time": 90116,
        "wood": 103720,
        "clay": 55855,
        "iron": 87765,
        "crop": 39885,
        "pop": 80,
        "cp": 138,
        "effects": {
          "trainingTimeStable": 0.109419
        }
      }
    ]
  },
  {
    "gid": 21,
    "slug": "workshop",
    "name": "Workshop",
    "category": "Military",
    "maxLevel": 22,
    "cultureBase": 3,
    "effects": [
      "trainingTimeWorkshop"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 5
      },
      {
        "type": "Building",
        "gid": [
          22
        ],
        "level": 10
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 3000,
        "wood": 460,
        "clay": 510,
        "iron": 600,
        "crop": 320,
        "pop": 3,
        "cp": 4,
        "effects": {
          "trainingTimeWorkshop": 1
        }
      },
      {
        "level": 2,
        "time": 3780,
        "wood": 590,
        "clay": 655,
        "iron": 770,
        "crop": 410,
        "pop": 5,
        "cp": 4,
        "effects": {
          "trainingTimeWorkshop": 0.9
        }
      },
      {
        "level": 3,
        "time": 4685,
        "wood": 755,
        "clay": 835,
        "iron": 985,
        "crop": 525,
        "pop": 7,
        "cp": 5,
        "effects": {
          "trainingTimeWorkshop": 0.81
        }
      },
      {
        "level": 4,
        "time": 5734,
        "wood": 965,
        "clay": 1070,
        "iron": 1260,
        "crop": 670,
        "pop": 9,
        "cp": 6,
        "effects": {
          "trainingTimeWorkshop": 0.7290000000000001
        }
      },
      {
        "level": 5,
        "time": 6952,
        "wood": 1235,
        "clay": 1370,
        "iron": 1610,
        "crop": 860,
        "pop": 11,
        "cp": 7,
        "effects": {
          "trainingTimeWorkshop": 0.6561000000000001
        }
      },
      {
        "level": 6,
        "time": 8364,
        "wood": 1580,
        "clay": 1750,
        "iron": 2060,
        "crop": 1100,
        "pop": 13,
        "cp": 9,
        "effects": {
          "trainingTimeWorkshop": 0.5904900000000001
        }
      },
      {
        "level": 7,
        "time": 10002,
        "wood": 2025,
        "clay": 2245,
        "iron": 2640,
        "crop": 1405,
        "pop": 15,
        "cp": 11,
        "effects": {
          "trainingTimeWorkshop": 0.531441
        }
      },
      {
        "level": 8,
        "time": 11903,
        "wood": 2590,
        "clay": 2870,
        "iron": 3380,
        "crop": 1800,
        "pop": 17,
        "cp": 13,
        "effects": {
          "trainingTimeWorkshop": 0.4782969000000001
        }
      },
      {
        "level": 9,
        "time": 14107,
        "wood": 3315,
        "clay": 3675,
        "iron": 4325,
        "crop": 2305,
        "pop": 19,
        "cp": 15,
        "effects": {
          "trainingTimeWorkshop": 0.4304672100000001
        }
      },
      {
        "level": 10,
        "time": 16664,
        "wood": 4245,
        "clay": 4705,
        "iron": 5535,
        "crop": 2950,
        "pop": 21,
        "cp": 19,
        "effects": {
          "trainingTimeWorkshop": 0.3874204890000001
        }
      },
      {
        "level": 11,
        "time": 19631,
        "wood": 5430,
        "clay": 6020,
        "iron": 7085,
        "crop": 3780,
        "pop": 24,
        "cp": 22,
        "effects": {
          "trainingTimeWorkshop": 0.3486784401000001
        }
      },
      {
        "level": 12,
        "time": 23072,
        "wood": 6950,
        "clay": 7705,
        "iron": 9065,
        "crop": 4835,
        "pop": 27,
        "cp": 27,
        "effects": {
          "trainingTimeWorkshop": 0.31381059609000006
        }
      },
      {
        "level": 13,
        "time": 27063,
        "wood": 8900,
        "clay": 9865,
        "iron": 11605,
        "crop": 6190,
        "pop": 30,
        "cp": 32,
        "effects": {
          "trainingTimeWorkshop": 0.2824295364810001
        }
      },
      {
        "level": 14,
        "time": 31693,
        "wood": 11390,
        "clay": 12625,
        "iron": 14855,
        "crop": 7925,
        "pop": 33,
        "cp": 39,
        "effects": {
          "trainingTimeWorkshop": 0.2541865828329001
        }
      },
      {
        "level": 15,
        "time": 37064,
        "wood": 14580,
        "clay": 16165,
        "iron": 19015,
        "crop": 10140,
        "pop": 36,
        "cp": 46,
        "effects": {
          "trainingTimeWorkshop": 0.2287679245496101
        }
      },
      {
        "level": 16,
        "time": 43294,
        "wood": 18660,
        "clay": 20690,
        "iron": 24340,
        "crop": 12980,
        "pop": 39,
        "cp": 55,
        "effects": {
          "trainingTimeWorkshop": 0.20589113209464907
        }
      },
      {
        "level": 17,
        "time": 50522,
        "wood": 23885,
        "clay": 26480,
        "iron": 31155,
        "crop": 16615,
        "pop": 42,
        "cp": 67,
        "effects": {
          "trainingTimeWorkshop": 0.18530201888518416
        }
      },
      {
        "level": 18,
        "time": 58905,
        "wood": 30570,
        "clay": 33895,
        "iron": 39875,
        "crop": 21270,
        "pop": 45,
        "cp": 80,
        "effects": {
          "trainingTimeWorkshop": 0.16677181699666577
        }
      },
      {
        "level": 19,
        "time": 68630,
        "wood": 39130,
        "clay": 43385,
        "iron": 51040,
        "crop": 27225,
        "pop": 48,
        "cp": 96,
        "effects": {
          "trainingTimeWorkshop": 0.15009463529699918
        }
      },
      {
        "level": 20,
        "time": 79911,
        "wood": 50090,
        "clay": 55535,
        "iron": 65335,
        "crop": 34845,
        "pop": 51,
        "cp": 115,
        "effects": {
          "trainingTimeWorkshop": 0.13508517176729928
        }
      },
      {
        "level": 21,
        "time": 92996,
        "wood": 64115,
        "clay": 71085,
        "iron": 83630,
        "crop": 44600,
        "pop": 54,
        "cp": 154,
        "effects": {
          "trainingTimeWorkshop": 0.121577
        }
      },
      {
        "level": 22,
        "time": 108176,
        "wood": 82065,
        "clay": 90990,
        "iron": 107045,
        "crop": 57090,
        "pop": 57,
        "cp": 207,
        "effects": {
          "trainingTimeWorkshop": 0.109419
        }
      }
    ]
  },
  {
    "gid": 22,
    "slug": "academy",
    "name": "Academy",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 4,
    "effects": [],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 3
      },
      {
        "type": "Building",
        "gid": [
          19
        ],
        "level": 3
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2000,
        "wood": 220,
        "clay": 160,
        "iron": 90,
        "crop": 40,
        "pop": 4,
        "cp": 5,
        "effects": {}
      },
      {
        "level": 2,
        "time": 2620,
        "wood": 295,
        "clay": 215,
        "iron": 120,
        "crop": 55,
        "pop": 6,
        "cp": 6,
        "effects": {}
      },
      {
        "level": 3,
        "time": 3339,
        "wood": 390,
        "clay": 285,
        "iron": 160,
        "crop": 70,
        "pop": 8,
        "cp": 7,
        "effects": {}
      },
      {
        "level": 4,
        "time": 4173,
        "wood": 520,
        "clay": 375,
        "iron": 210,
        "crop": 95,
        "pop": 10,
        "cp": 8,
        "effects": {}
      },
      {
        "level": 5,
        "time": 5141,
        "wood": 690,
        "clay": 500,
        "iron": 280,
        "crop": 125,
        "pop": 12,
        "cp": 10,
        "effects": {}
      },
      {
        "level": 6,
        "time": 6264,
        "wood": 915,
        "clay": 665,
        "iron": 375,
        "crop": 165,
        "pop": 15,
        "cp": 12,
        "effects": {}
      },
      {
        "level": 7,
        "time": 7566,
        "wood": 1220,
        "clay": 885,
        "iron": 500,
        "crop": 220,
        "pop": 18,
        "cp": 14,
        "effects": {}
      },
      {
        "level": 8,
        "time": 9077,
        "wood": 1620,
        "clay": 1180,
        "iron": 665,
        "crop": 295,
        "pop": 21,
        "cp": 17,
        "effects": {}
      },
      {
        "level": 9,
        "time": 10829,
        "wood": 2155,
        "clay": 1565,
        "iron": 880,
        "crop": 390,
        "pop": 24,
        "cp": 21,
        "effects": {}
      },
      {
        "level": 10,
        "time": 12861,
        "wood": 2865,
        "clay": 2085,
        "iron": 1170,
        "crop": 520,
        "pop": 27,
        "cp": 25,
        "effects": {}
      },
      {
        "level": 11,
        "time": 15219,
        "wood": 3810,
        "clay": 2770,
        "iron": 1560,
        "crop": 695,
        "pop": 30,
        "cp": 30,
        "effects": {}
      },
      {
        "level": 12,
        "time": 17954,
        "wood": 5065,
        "clay": 3685,
        "iron": 2075,
        "crop": 920,
        "pop": 33,
        "cp": 36,
        "effects": {}
      },
      {
        "level": 13,
        "time": 21127,
        "wood": 6740,
        "clay": 4900,
        "iron": 2755,
        "crop": 1225,
        "pop": 36,
        "cp": 43,
        "effects": {}
      },
      {
        "level": 14,
        "time": 24807,
        "wood": 8965,
        "clay": 6520,
        "iron": 3665,
        "crop": 1630,
        "pop": 39,
        "cp": 51,
        "effects": {}
      },
      {
        "level": 15,
        "time": 29077,
        "wood": 11920,
        "clay": 8670,
        "iron": 4875,
        "crop": 2170,
        "pop": 42,
        "cp": 62,
        "effects": {}
      },
      {
        "level": 16,
        "time": 34029,
        "wood": 15855,
        "clay": 11530,
        "iron": 6485,
        "crop": 2885,
        "pop": 46,
        "cp": 74,
        "effects": {}
      },
      {
        "level": 17,
        "time": 39774,
        "wood": 21090,
        "clay": 15335,
        "iron": 8625,
        "crop": 3835,
        "pop": 50,
        "cp": 89,
        "effects": {}
      },
      {
        "level": 18,
        "time": 46437,
        "wood": 28050,
        "clay": 20400,
        "iron": 11475,
        "crop": 5100,
        "pop": 54,
        "cp": 106,
        "effects": {}
      },
      {
        "level": 19,
        "time": 54167,
        "wood": 37305,
        "clay": 27130,
        "iron": 15260,
        "crop": 6780,
        "pop": 58,
        "cp": 128,
        "effects": {}
      },
      {
        "level": 20,
        "time": 63134,
        "wood": 49615,
        "clay": 36085,
        "iron": 20295,
        "crop": 9020,
        "pop": 62,
        "cp": 153,
        "effects": {}
      }
    ]
  },
  {
    "gid": 23,
    "slug": "cranny",
    "name": "Cranny",
    "category": "Infrastructure",
    "maxLevel": 10,
    "cultureBase": 1,
    "effects": [
      "storageCranny",
      "storageCrannyGaul"
    ],
    "prerequisites": [],
    "levels": [
      {
        "level": 1,
        "time": 750,
        "wood": 40,
        "clay": 50,
        "iron": 30,
        "crop": 10,
        "pop": 0,
        "cp": 1,
        "effects": {
          "storageCranny": 200,
          "storageCrannyGaul": 300
        }
      },
      {
        "level": 2,
        "time": 1170,
        "wood": 50,
        "clay": 65,
        "iron": 40,
        "crop": 15,
        "pop": 0,
        "cp": 1,
        "effects": {
          "storageCranny": 260,
          "storageCrannyGaul": 390
        }
      },
      {
        "level": 3,
        "time": 1657,
        "wood": 65,
        "clay": 80,
        "iron": 50,
        "crop": 15,
        "pop": 0,
        "cp": 2,
        "effects": {
          "storageCranny": 340,
          "storageCrannyGaul": 510
        }
      },
      {
        "level": 4,
        "time": 2222,
        "wood": 85,
        "clay": 105,
        "iron": 65,
        "crop": 20,
        "pop": 0,
        "cp": 2,
        "effects": {
          "storageCranny": 440,
          "storageCrannyGaul": 660
        }
      },
      {
        "level": 5,
        "time": 2878,
        "wood": 105,
        "clay": 135,
        "iron": 80,
        "crop": 25,
        "pop": 0,
        "cp": 2,
        "effects": {
          "storageCranny": 560,
          "storageCrannyGaul": 840
        }
      },
      {
        "level": 6,
        "time": 3638,
        "wood": 135,
        "clay": 170,
        "iron": 105,
        "crop": 35,
        "pop": 1,
        "cp": 3,
        "effects": {
          "storageCranny": 720,
          "storageCrannyGaul": 1080
        }
      },
      {
        "level": 7,
        "time": 4521,
        "wood": 175,
        "clay": 220,
        "iron": 130,
        "crop": 45,
        "pop": 2,
        "cp": 4,
        "effects": {
          "storageCranny": 920,
          "storageCrannyGaul": 1380
        }
      },
      {
        "level": 8,
        "time": 5544,
        "wood": 225,
        "clay": 280,
        "iron": 170,
        "crop": 55,
        "pop": 3,
        "cp": 4,
        "effects": {
          "storageCranny": 1200,
          "storageCrannyGaul": 1800
        }
      },
      {
        "level": 9,
        "time": 6731,
        "wood": 290,
        "clay": 360,
        "iron": 215,
        "crop": 70,
        "pop": 4,
        "cp": 5,
        "effects": {
          "storageCranny": 1540,
          "storageCrannyGaul": 2310
        }
      },
      {
        "level": 10,
        "time": 8108,
        "wood": 370,
        "clay": 460,
        "iron": 275,
        "crop": 90,
        "pop": 5,
        "cp": 6,
        "effects": {
          "storageCranny": 2000,
          "storageCrannyGaul": 3000
        }
      }
    ]
  },
  {
    "gid": 24,
    "slug": "festival-grounds",
    "name": "Festival Grounds",
    "category": "Infrastructure",
    "maxLevel": 20,
    "cultureBase": 5,
    "effects": [
      "smallPartyTime",
      "largePartyTime"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 10
      },
      {
        "type": "Building",
        "gid": [
          22
        ],
        "level": 10
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 12500,
        "wood": 1250,
        "clay": 1110,
        "iron": 1260,
        "crop": 600,
        "pop": 4,
        "cp": 6,
        "effects": {
          "smallPartyTime": 86400,
          "largePartyTime": null
        }
      },
      {
        "level": 2,
        "time": 14800,
        "wood": 1600,
        "clay": 1420,
        "iron": 1615,
        "crop": 770,
        "pop": 6,
        "cp": 7,
        "effects": {
          "smallPartyTime": 83289.59999999999,
          "largePartyTime": null
        }
      },
      {
        "level": 3,
        "time": 17468,
        "wood": 2050,
        "clay": 1820,
        "iron": 2065,
        "crop": 985,
        "pop": 8,
        "cp": 9,
        "effects": {
          "smallPartyTime": 80291.17439999999,
          "largePartyTime": null
        }
      },
      {
        "level": 4,
        "time": 20563,
        "wood": 2620,
        "clay": 2330,
        "iron": 2640,
        "crop": 1260,
        "pop": 10,
        "cp": 10,
        "effects": {
          "smallPartyTime": 77400.69212159999,
          "largePartyTime": null
        }
      },
      {
        "level": 5,
        "time": 24153,
        "wood": 3355,
        "clay": 2980,
        "iron": 3380,
        "crop": 1610,
        "pop": 12,
        "cp": 12,
        "effects": {
          "smallPartyTime": 74614.2672052224,
          "largePartyTime": null
        }
      },
      {
        "level": 6,
        "time": 28317,
        "wood": 4295,
        "clay": 3815,
        "iron": 4330,
        "crop": 2060,
        "pop": 15,
        "cp": 15,
        "effects": {
          "smallPartyTime": 71928.15358583439,
          "largePartyTime": null
        }
      },
      {
        "level": 7,
        "time": 33148,
        "wood": 5500,
        "clay": 4880,
        "iron": 5540,
        "crop": 2640,
        "pop": 18,
        "cp": 18,
        "effects": {
          "smallPartyTime": 69338.74005674434,
          "largePartyTime": null
        }
      },
      {
        "level": 8,
        "time": 38752,
        "wood": 7035,
        "clay": 6250,
        "iron": 7095,
        "crop": 3380,
        "pop": 21,
        "cp": 21,
        "effects": {
          "smallPartyTime": 66842.54541470154,
          "largePartyTime": null
        }
      },
      {
        "level": 9,
        "time": 45252,
        "wood": 9005,
        "clay": 8000,
        "iron": 9080,
        "crop": 4325,
        "pop": 24,
        "cp": 26,
        "effects": {
          "smallPartyTime": 64436.21377977229,
          "largePartyTime": null
        }
      },
      {
        "level": 10,
        "time": 52793,
        "wood": 11530,
        "clay": 10240,
        "iron": 11620,
        "crop": 5535,
        "pop": 27,
        "cp": 31,
        "effects": {
          "smallPartyTime": 62116.51008370048,
          "largePartyTime": 155291.27520925118
        }
      },
      {
        "level": 11,
        "time": 61539,
        "wood": 14755,
        "clay": 13105,
        "iron": 14875,
        "crop": 7085,
        "pop": 30,
        "cp": 37,
        "effects": {
          "smallPartyTime": 59880.315720687264,
          "largePartyTime": 149700.78930171815
        }
      },
      {
        "level": 12,
        "time": 71686,
        "wood": 18890,
        "clay": 16775,
        "iron": 19040,
        "crop": 9065,
        "pop": 33,
        "cp": 45,
        "effects": {
          "smallPartyTime": 57724.62435474252,
          "largePartyTime": 144311.5608868563
        }
      },
      {
        "level": 13,
        "time": 83455,
        "wood": 24180,
        "clay": 21470,
        "iron": 24370,
        "crop": 11605,
        "pop": 36,
        "cp": 53,
        "effects": {
          "smallPartyTime": 55646.53787797179,
          "largePartyTime": 139116.34469492946
        }
      },
      {
        "level": 14,
        "time": 97108,
        "wood": 30950,
        "clay": 27480,
        "iron": 31195,
        "crop": 14855,
        "pop": 39,
        "cp": 64,
        "effects": {
          "smallPartyTime": 53643.262514364804,
          "largePartyTime": 134108.156285912
        }
      },
      {
        "level": 15,
        "time": 112946,
        "wood": 39615,
        "clay": 35175,
        "iron": 39930,
        "crop": 19015,
        "pop": 42,
        "cp": 77,
        "effects": {
          "smallPartyTime": 51712.10506384767,
          "largePartyTime": 129280.26265961917
        }
      },
      {
        "level": 16,
        "time": 131317,
        "wood": 50705,
        "clay": 45025,
        "iron": 51110,
        "crop": 24340,
        "pop": 46,
        "cp": 92,
        "effects": {
          "smallPartyTime": 49850.46928154914,
          "largePartyTime": 124626.17320387287
        }
      },
      {
        "level": 17,
        "time": 152628,
        "wood": 64905,
        "clay": 57635,
        "iron": 65425,
        "crop": 31155,
        "pop": 50,
        "cp": 111,
        "effects": {
          "smallPartyTime": 48055.852387413375,
          "largePartyTime": 120139.63096853343
        }
      },
      {
        "level": 18,
        "time": 177348,
        "wood": 83075,
        "clay": 73770,
        "iron": 83740,
        "crop": 39875,
        "pop": 54,
        "cp": 133,
        "effects": {
          "smallPartyTime": 46325.84170146649,
          "largePartyTime": 115814.60425366623
        }
      },
      {
        "level": 19,
        "time": 206024,
        "wood": 106340,
        "clay": 94430,
        "iron": 107190,
        "crop": 51040,
        "pop": 58,
        "cp": 160,
        "effects": {
          "smallPartyTime": 44658.1114002137,
          "largePartyTime": 111645.27850053423
        }
      },
      {
        "level": 20,
        "time": 239287,
        "wood": 136115,
        "clay": 120870,
        "iron": 137200,
        "crop": 65335,
        "pop": 62,
        "cp": 192,
        "effects": {
          "smallPartyTime": 43050.419389806004,
          "largePartyTime": 107626.04847451502
        }
      }
    ]
  },
  {
    "gid": 25,
    "slug": "residence",
    "name": "Residence",
    "category": "Infrastructure",
    "maxLevel": 20,
    "cultureBase": 2,
    "effects": [
      "slots",
      "trainingTimeResidence"
    ],
    "prerequisites": [
      {
        "type": "NotBuilding",
        "gid": 26
      },
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 5
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2000,
        "wood": 580,
        "clay": 460,
        "iron": 350,
        "crop": 180,
        "pop": 1,
        "cp": 2,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 1
        }
      },
      {
        "level": 2,
        "time": 2620,
        "wood": 740,
        "clay": 590,
        "iron": 450,
        "crop": 230,
        "pop": 2,
        "cp": 3,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.9
        }
      },
      {
        "level": 3,
        "time": 3339,
        "wood": 950,
        "clay": 755,
        "iron": 575,
        "crop": 295,
        "pop": 3,
        "cp": 3,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.81
        }
      },
      {
        "level": 4,
        "time": 4173,
        "wood": 1215,
        "clay": 965,
        "iron": 735,
        "crop": 375,
        "pop": 4,
        "cp": 4,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.7290000000000001
        }
      },
      {
        "level": 5,
        "time": 5141,
        "wood": 1555,
        "clay": 1235,
        "iron": 940,
        "crop": 485,
        "pop": 5,
        "cp": 5,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.6561000000000001
        }
      },
      {
        "level": 6,
        "time": 6264,
        "wood": 1995,
        "clay": 1580,
        "iron": 1205,
        "crop": 620,
        "pop": 6,
        "cp": 6,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.5904900000000001
        }
      },
      {
        "level": 7,
        "time": 7566,
        "wood": 2550,
        "clay": 2025,
        "iron": 1540,
        "crop": 790,
        "pop": 7,
        "cp": 7,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.531441
        }
      },
      {
        "level": 8,
        "time": 9077,
        "wood": 3265,
        "clay": 2590,
        "iron": 1970,
        "crop": 1015,
        "pop": 8,
        "cp": 9,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.4782969000000001
        }
      },
      {
        "level": 9,
        "time": 10829,
        "wood": 4180,
        "clay": 3315,
        "iron": 2520,
        "crop": 1295,
        "pop": 9,
        "cp": 10,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.4304672100000001
        }
      },
      {
        "level": 10,
        "time": 12861,
        "wood": 5350,
        "clay": 4245,
        "iron": 3230,
        "crop": 1660,
        "pop": 10,
        "cp": 12,
        "effects": {
          "slots": 1,
          "trainingTimeResidence": 0.3874204890000001
        }
      },
      {
        "level": 11,
        "time": 15219,
        "wood": 6845,
        "clay": 5430,
        "iron": 4130,
        "crop": 2125,
        "pop": 12,
        "cp": 15,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.3486784401000001
        }
      },
      {
        "level": 12,
        "time": 17954,
        "wood": 8765,
        "clay": 6950,
        "iron": 5290,
        "crop": 2720,
        "pop": 14,
        "cp": 18,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.31381059609000006
        }
      },
      {
        "level": 13,
        "time": 21127,
        "wood": 11220,
        "clay": 8900,
        "iron": 6770,
        "crop": 3480,
        "pop": 16,
        "cp": 21,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.2824295364810001
        }
      },
      {
        "level": 14,
        "time": 24807,
        "wood": 14360,
        "clay": 11390,
        "iron": 8665,
        "crop": 4455,
        "pop": 18,
        "cp": 26,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.2541865828329001
        }
      },
      {
        "level": 15,
        "time": 29077,
        "wood": 18380,
        "clay": 14580,
        "iron": 11090,
        "crop": 5705,
        "pop": 20,
        "cp": 31,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.2287679245496101
        }
      },
      {
        "level": 16,
        "time": 34029,
        "wood": 23530,
        "clay": 18660,
        "iron": 14200,
        "crop": 7300,
        "pop": 22,
        "cp": 37,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.20589113209464907
        }
      },
      {
        "level": 17,
        "time": 39774,
        "wood": 30115,
        "clay": 23885,
        "iron": 18175,
        "crop": 9345,
        "pop": 24,
        "cp": 44,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.18530201888518416
        }
      },
      {
        "level": 18,
        "time": 46437,
        "wood": 38550,
        "clay": 30570,
        "iron": 23260,
        "crop": 11965,
        "pop": 26,
        "cp": 53,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.16677181699666577
        }
      },
      {
        "level": 19,
        "time": 54167,
        "wood": 49340,
        "clay": 39130,
        "iron": 29775,
        "crop": 15315,
        "pop": 28,
        "cp": 64,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.15009463529699918
        }
      },
      {
        "level": 20,
        "time": 63134,
        "wood": 63155,
        "clay": 50090,
        "iron": 38110,
        "crop": 19600,
        "pop": 30,
        "cp": 77,
        "effects": {
          "slots": 2,
          "trainingTimeResidence": 0.13508517176729928
        }
      }
    ]
  },
  {
    "gid": 26,
    "slug": "palace",
    "name": "Palace",
    "category": "Infrastructure",
    "maxLevel": 20,
    "cultureBase": 5,
    "effects": [
      "slots",
      "trainingTimeResidence"
    ],
    "prerequisites": [
      {
        "type": "NotBuilding",
        "gid": 25
      },
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 5
      },
      {
        "type": "Building",
        "gid": [
          18
        ],
        "level": 1
      },
      {
        "type": "NotBuilding",
        "gid": 40
      },
      {
        "type": "UniqueInAccount"
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 5000,
        "wood": 550,
        "clay": 800,
        "iron": 750,
        "crop": 250,
        "pop": 1,
        "cp": 6,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 1
        }
      },
      {
        "level": 2,
        "time": 6100,
        "wood": 705,
        "clay": 1025,
        "iron": 960,
        "crop": 320,
        "pop": 2,
        "cp": 7,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.9
        }
      },
      {
        "level": 3,
        "time": 7376,
        "wood": 900,
        "clay": 1310,
        "iron": 1230,
        "crop": 410,
        "pop": 3,
        "cp": 9,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.81
        }
      },
      {
        "level": 4,
        "time": 8856,
        "wood": 1155,
        "clay": 1680,
        "iron": 1575,
        "crop": 525,
        "pop": 4,
        "cp": 10,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.7290000000000001
        }
      },
      {
        "level": 5,
        "time": 10573,
        "wood": 1475,
        "clay": 2145,
        "iron": 2015,
        "crop": 670,
        "pop": 5,
        "cp": 12,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.6561000000000001
        }
      },
      {
        "level": 6,
        "time": 12565,
        "wood": 1890,
        "clay": 2750,
        "iron": 2575,
        "crop": 860,
        "pop": 6,
        "cp": 15,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.5904900000000001
        }
      },
      {
        "level": 7,
        "time": 14875,
        "wood": 2420,
        "clay": 3520,
        "iron": 3300,
        "crop": 1100,
        "pop": 7,
        "cp": 18,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.531441
        }
      },
      {
        "level": 8,
        "time": 17555,
        "wood": 3095,
        "clay": 4505,
        "iron": 4220,
        "crop": 1405,
        "pop": 8,
        "cp": 21,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.4782969000000001
        }
      },
      {
        "level": 9,
        "time": 20664,
        "wood": 3965,
        "clay": 5765,
        "iron": 5405,
        "crop": 1800,
        "pop": 9,
        "cp": 26,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.4304672100000001
        }
      },
      {
        "level": 10,
        "time": 24270,
        "wood": 5075,
        "clay": 7380,
        "iron": 6920,
        "crop": 2305,
        "pop": 10,
        "cp": 31,
        "effects": {
          "slots": 1,
          "trainingTimeResidence": 0.3874204890000001
        }
      },
      {
        "level": 11,
        "time": 28454,
        "wood": 6495,
        "clay": 9445,
        "iron": 8855,
        "crop": 2950,
        "pop": 12,
        "cp": 37,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.3486784401000001
        }
      },
      {
        "level": 12,
        "time": 33306,
        "wood": 8310,
        "clay": 12090,
        "iron": 11335,
        "crop": 3780,
        "pop": 14,
        "cp": 45,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.31381059609000006
        }
      },
      {
        "level": 13,
        "time": 38935,
        "wood": 10640,
        "clay": 15475,
        "iron": 14505,
        "crop": 4835,
        "pop": 16,
        "cp": 53,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.2824295364810001
        }
      },
      {
        "level": 14,
        "time": 45465,
        "wood": 13615,
        "clay": 19805,
        "iron": 18570,
        "crop": 6190,
        "pop": 18,
        "cp": 64,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.2541865828329001
        }
      },
      {
        "level": 15,
        "time": 53039,
        "wood": 17430,
        "clay": 25355,
        "iron": 23770,
        "crop": 7925,
        "pop": 20,
        "cp": 77,
        "effects": {
          "slots": 2,
          "trainingTimeResidence": 0.2287679245496101
        }
      },
      {
        "level": 16,
        "time": 61825,
        "wood": 22310,
        "clay": 32450,
        "iron": 30425,
        "crop": 10140,
        "pop": 22,
        "cp": 92,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.20589113209464907
        }
      },
      {
        "level": 17,
        "time": 72018,
        "wood": 28560,
        "clay": 41540,
        "iron": 38940,
        "crop": 12980,
        "pop": 24,
        "cp": 111,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.18530201888518416
        }
      },
      {
        "level": 18,
        "time": 83840,
        "wood": 36555,
        "clay": 53170,
        "iron": 49845,
        "crop": 16615,
        "pop": 26,
        "cp": 133,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.16677181699666577
        }
      },
      {
        "level": 19,
        "time": 97555,
        "wood": 46790,
        "clay": 68055,
        "iron": 63805,
        "crop": 21270,
        "pop": 28,
        "cp": 160,
        "effects": {
          "slots": null,
          "trainingTimeResidence": 0.15009463529699918
        }
      },
      {
        "level": 20,
        "time": 113464,
        "wood": 59890,
        "clay": 87110,
        "iron": 81670,
        "crop": 27225,
        "pop": 30,
        "cp": 192,
        "effects": {
          "slots": 3,
          "trainingTimeResidence": 0.13508517176729928
        }
      }
    ]
  },
  {
    "gid": 27,
    "slug": "treasury",
    "name": "Treasury",
    "category": "Infrastructure",
    "maxLevel": 20,
    "cultureBase": 6,
    "effects": [],
    "prerequisites": [],
    "levels": [
      {
        "level": 1,
        "time": 8000,
        "wood": 720,
        "clay": 685,
        "iron": 645,
        "crop": 250,
        "pop": 4,
        "cp": 7,
        "effects": {}
      },
      {
        "level": 2,
        "time": 9580,
        "wood": 1815,
        "clay": 1725,
        "iron": 1625,
        "crop": 625,
        "pop": 6,
        "cp": 9,
        "effects": {}
      },
      {
        "level": 3,
        "time": 11413,
        "wood": 2285,
        "clay": 2175,
        "iron": 2050,
        "crop": 785,
        "pop": 8,
        "cp": 10,
        "effects": {}
      },
      {
        "level": 4,
        "time": 13539,
        "wood": 2880,
        "clay": 2740,
        "iron": 2580,
        "crop": 990,
        "pop": 10,
        "cp": 12,
        "effects": {}
      },
      {
        "level": 5,
        "time": 16005,
        "wood": 3630,
        "clay": 3455,
        "iron": 3250,
        "crop": 1250,
        "pop": 12,
        "cp": 15,
        "effects": {}
      },
      {
        "level": 6,
        "time": 18866,
        "wood": 4575,
        "clay": 4350,
        "iron": 4095,
        "crop": 1570,
        "pop": 15,
        "cp": 18,
        "effects": {}
      },
      {
        "level": 7,
        "time": 22184,
        "wood": 5760,
        "clay": 5480,
        "iron": 5160,
        "crop": 1980,
        "pop": 18,
        "cp": 21,
        "effects": {}
      },
      {
        "level": 8,
        "time": 26034,
        "wood": 7260,
        "clay": 6905,
        "iron": 6505,
        "crop": 2495,
        "pop": 21,
        "cp": 26,
        "effects": {}
      },
      {
        "level": 9,
        "time": 30499,
        "wood": 9150,
        "clay": 8705,
        "iron": 8195,
        "crop": 3145,
        "pop": 24,
        "cp": 31,
        "effects": {}
      },
      {
        "level": 10,
        "time": 35679,
        "wood": 11525,
        "clay": 10965,
        "iron": 10325,
        "crop": 3960,
        "pop": 27,
        "cp": 37,
        "effects": {}
      },
      {
        "level": 11,
        "time": 41688,
        "wood": 14525,
        "clay": 13815,
        "iron": 13010,
        "crop": 4990,
        "pop": 30,
        "cp": 45,
        "effects": {}
      },
      {
        "level": 12,
        "time": 48658,
        "wood": 18300,
        "clay": 17410,
        "iron": 16395,
        "crop": 6290,
        "pop": 33,
        "cp": 53,
        "effects": {}
      },
      {
        "level": 13,
        "time": 56743,
        "wood": 23055,
        "clay": 21935,
        "iron": 20655,
        "crop": 7925,
        "pop": 36,
        "cp": 64,
        "effects": {}
      },
      {
        "level": 14,
        "time": 66122,
        "wood": 29050,
        "clay": 27640,
        "iron": 26025,
        "crop": 9985,
        "pop": 39,
        "cp": 77,
        "effects": {}
      },
      {
        "level": 15,
        "time": 77002,
        "wood": 36605,
        "clay": 34825,
        "iron": 32795,
        "crop": 12585,
        "pop": 42,
        "cp": 92,
        "effects": {}
      },
      {
        "level": 16,
        "time": 89622,
        "wood": 46125,
        "clay": 43880,
        "iron": 41320,
        "crop": 15855,
        "pop": 46,
        "cp": 111,
        "effects": {}
      },
      {
        "level": 17,
        "time": 104262,
        "wood": 58115,
        "clay": 55290,
        "iron": 52060,
        "crop": 19975,
        "pop": 50,
        "cp": 133,
        "effects": {}
      },
      {
        "level": 18,
        "time": 121243,
        "wood": 73225,
        "clay": 69665,
        "iron": 65600,
        "crop": 25170,
        "pop": 54,
        "cp": 160,
        "effects": {}
      },
      {
        "level": 19,
        "time": 140942,
        "wood": 92265,
        "clay": 87780,
        "iron": 82655,
        "crop": 31715,
        "pop": 58,
        "cp": 192,
        "effects": {}
      },
      {
        "level": 20,
        "time": 163793,
        "wood": 116255,
        "clay": 110600,
        "iron": 104145,
        "crop": 39960,
        "pop": 62,
        "cp": 230,
        "effects": {}
      }
    ]
  },
  {
    "gid": 28,
    "slug": "trade-office",
    "name": "Trade Office",
    "category": "Infrastructure",
    "maxLevel": 20,
    "cultureBase": 3,
    "effects": [
      "merchantBoost",
      "merchantBoostRoman"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          17
        ],
        "level": 20
      },
      {
        "type": "Building",
        "gid": [
          20
        ],
        "level": 10
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 3000,
        "wood": 1400,
        "clay": 1330,
        "iron": 1200,
        "crop": 400,
        "pop": 3,
        "cp": 4,
        "effects": {
          "merchantBoost": 0.1,
          "merchantBoostRoman": 0.2
        }
      },
      {
        "level": 2,
        "time": 3780,
        "wood": 1790,
        "clay": 1700,
        "iron": 1535,
        "crop": 510,
        "pop": 5,
        "cp": 4,
        "effects": {
          "merchantBoost": 0.2,
          "merchantBoostRoman": 0.4
        }
      },
      {
        "level": 3,
        "time": 4685,
        "wood": 2295,
        "clay": 2180,
        "iron": 1965,
        "crop": 655,
        "pop": 7,
        "cp": 5,
        "effects": {
          "merchantBoost": 0.3,
          "merchantBoostRoman": 0.6
        }
      },
      {
        "level": 4,
        "time": 5734,
        "wood": 2935,
        "clay": 2790,
        "iron": 2515,
        "crop": 840,
        "pop": 9,
        "cp": 6,
        "effects": {
          "merchantBoost": 0.4,
          "merchantBoostRoman": 0.8
        }
      },
      {
        "level": 5,
        "time": 6952,
        "wood": 3760,
        "clay": 3570,
        "iron": 3220,
        "crop": 1075,
        "pop": 11,
        "cp": 7,
        "effects": {
          "merchantBoost": 0.5,
          "merchantBoostRoman": 1
        }
      },
      {
        "level": 6,
        "time": 8364,
        "wood": 4810,
        "clay": 4570,
        "iron": 4125,
        "crop": 1375,
        "pop": 13,
        "cp": 9,
        "effects": {
          "merchantBoost": 0.6,
          "merchantBoostRoman": 1.2
        }
      },
      {
        "level": 7,
        "time": 10002,
        "wood": 6155,
        "clay": 5850,
        "iron": 5280,
        "crop": 1760,
        "pop": 15,
        "cp": 11,
        "effects": {
          "merchantBoost": 0.7,
          "merchantBoostRoman": 1.4
        }
      },
      {
        "level": 8,
        "time": 11903,
        "wood": 7880,
        "clay": 7485,
        "iron": 6755,
        "crop": 2250,
        "pop": 17,
        "cp": 13,
        "effects": {
          "merchantBoost": 0.8,
          "merchantBoostRoman": 1.6
        }
      },
      {
        "level": 9,
        "time": 14107,
        "wood": 10090,
        "clay": 9585,
        "iron": 8645,
        "crop": 2880,
        "pop": 19,
        "cp": 15,
        "effects": {
          "merchantBoost": 0.9,
          "merchantBoostRoman": 1.8
        }
      },
      {
        "level": 10,
        "time": 16664,
        "wood": 12915,
        "clay": 12265,
        "iron": 11070,
        "crop": 3690,
        "pop": 21,
        "cp": 19,
        "effects": {
          "merchantBoost": 1,
          "merchantBoostRoman": 2
        }
      },
      {
        "level": 11,
        "time": 19631,
        "wood": 16530,
        "clay": 15700,
        "iron": 14165,
        "crop": 4720,
        "pop": 24,
        "cp": 22,
        "effects": {
          "merchantBoost": 1.1,
          "merchantBoostRoman": 2.2
        }
      },
      {
        "level": 12,
        "time": 23072,
        "wood": 21155,
        "clay": 20100,
        "iron": 18135,
        "crop": 6045,
        "pop": 27,
        "cp": 27,
        "effects": {
          "merchantBoost": 1.2,
          "merchantBoostRoman": 2.4
        }
      },
      {
        "level": 13,
        "time": 27063,
        "wood": 27080,
        "clay": 25725,
        "iron": 23210,
        "crop": 7735,
        "pop": 30,
        "cp": 32,
        "effects": {
          "merchantBoost": 1.3,
          "merchantBoostRoman": 2.6
        }
      },
      {
        "level": 14,
        "time": 31693,
        "wood": 34660,
        "clay": 32930,
        "iron": 29710,
        "crop": 9905,
        "pop": 33,
        "cp": 39,
        "effects": {
          "merchantBoost": 1.4,
          "merchantBoostRoman": 2.8
        }
      },
      {
        "level": 15,
        "time": 37064,
        "wood": 44370,
        "clay": 42150,
        "iron": 38030,
        "crop": 12675,
        "pop": 36,
        "cp": 46,
        "effects": {
          "merchantBoost": 1.5,
          "merchantBoostRoman": 3
        }
      },
      {
        "level": 16,
        "time": 43294,
        "wood": 56790,
        "clay": 53950,
        "iron": 48680,
        "crop": 16225,
        "pop": 39,
        "cp": 55,
        "effects": {
          "merchantBoost": 1.6,
          "merchantBoostRoman": 3.2
        }
      },
      {
        "level": 17,
        "time": 50522,
        "wood": 72690,
        "clay": 69060,
        "iron": 62310,
        "crop": 20770,
        "pop": 42,
        "cp": 67,
        "effects": {
          "merchantBoost": 1.7,
          "merchantBoostRoman": 3.4
        }
      },
      {
        "level": 18,
        "time": 58905,
        "wood": 93045,
        "clay": 88395,
        "iron": 79755,
        "crop": 26585,
        "pop": 45,
        "cp": 80,
        "effects": {
          "merchantBoost": 1.8,
          "merchantBoostRoman": 3.6
        }
      },
      {
        "level": 19,
        "time": 68630,
        "wood": 119100,
        "clay": 113145,
        "iron": 102085,
        "crop": 34030,
        "pop": 48,
        "cp": 96,
        "effects": {
          "merchantBoost": 1.9,
          "merchantBoostRoman": 3.8
        }
      },
      {
        "level": 20,
        "time": 79911,
        "wood": 152445,
        "clay": 144825,
        "iron": 130670,
        "crop": 43555,
        "pop": 51,
        "cp": 115,
        "effects": {
          "merchantBoost": 2,
          "merchantBoostRoman": 4
        }
      }
    ]
  },
  {
    "gid": 29,
    "slug": "great-barracks",
    "name": "Great Barracks",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "trainingTimeBarracks"
    ],
    "prerequisites": [
      {
        "type": "City"
      },
      {
        "type": "Building",
        "gid": [
          19
        ],
        "level": 20
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2000,
        "wood": 630,
        "clay": 420,
        "iron": 780,
        "crop": 360,
        "pop": 4,
        "cp": 1,
        "effects": {
          "trainingTimeBarracks": 1
        }
      },
      {
        "level": 2,
        "time": 2620,
        "wood": 805,
        "clay": 540,
        "iron": 1000,
        "crop": 460,
        "pop": 6,
        "cp": 1,
        "effects": {
          "trainingTimeBarracks": 0.9
        }
      },
      {
        "level": 3,
        "time": 3339,
        "wood": 1030,
        "clay": 690,
        "iron": 1280,
        "crop": 590,
        "pop": 8,
        "cp": 2,
        "effects": {
          "trainingTimeBarracks": 0.81
        }
      },
      {
        "level": 4,
        "time": 4173,
        "wood": 1320,
        "clay": 880,
        "iron": 1635,
        "crop": 755,
        "pop": 10,
        "cp": 2,
        "effects": {
          "trainingTimeBarracks": 0.7290000000000001
        }
      },
      {
        "level": 5,
        "time": 5141,
        "wood": 1690,
        "clay": 1125,
        "iron": 2095,
        "crop": 965,
        "pop": 12,
        "cp": 2,
        "effects": {
          "trainingTimeBarracks": 0.6561000000000001
        }
      },
      {
        "level": 6,
        "time": 6264,
        "wood": 2165,
        "clay": 1445,
        "iron": 2680,
        "crop": 1235,
        "pop": 15,
        "cp": 3,
        "effects": {
          "trainingTimeBarracks": 0.5904900000000001
        }
      },
      {
        "level": 7,
        "time": 7566,
        "wood": 2770,
        "clay": 1845,
        "iron": 3430,
        "crop": 1585,
        "pop": 18,
        "cp": 4,
        "effects": {
          "trainingTimeBarracks": 0.531441
        }
      },
      {
        "level": 8,
        "time": 9077,
        "wood": 3545,
        "clay": 2365,
        "iron": 4390,
        "crop": 2025,
        "pop": 21,
        "cp": 4,
        "effects": {
          "trainingTimeBarracks": 0.4782969000000001
        }
      },
      {
        "level": 9,
        "time": 10829,
        "wood": 4540,
        "clay": 3025,
        "iron": 5620,
        "crop": 2595,
        "pop": 24,
        "cp": 5,
        "effects": {
          "trainingTimeBarracks": 0.4304672100000001
        }
      },
      {
        "level": 10,
        "time": 12861,
        "wood": 5810,
        "clay": 3875,
        "iron": 7195,
        "crop": 3320,
        "pop": 27,
        "cp": 6,
        "effects": {
          "trainingTimeBarracks": 0.3874204890000001
        }
      },
      {
        "level": 11,
        "time": 15219,
        "wood": 7440,
        "clay": 4960,
        "iron": 9210,
        "crop": 4250,
        "pop": 30,
        "cp": 7,
        "effects": {
          "trainingTimeBarracks": 0.3486784401000001
        }
      },
      {
        "level": 12,
        "time": 17954,
        "wood": 9520,
        "clay": 6345,
        "iron": 11785,
        "crop": 5440,
        "pop": 33,
        "cp": 9,
        "effects": {
          "trainingTimeBarracks": 0.31381059609000006
        }
      },
      {
        "level": 13,
        "time": 21127,
        "wood": 12185,
        "clay": 8125,
        "iron": 15085,
        "crop": 6965,
        "pop": 36,
        "cp": 11,
        "effects": {
          "trainingTimeBarracks": 0.2824295364810001
        }
      },
      {
        "level": 14,
        "time": 24807,
        "wood": 15600,
        "clay": 10400,
        "iron": 19310,
        "crop": 8915,
        "pop": 39,
        "cp": 13,
        "effects": {
          "trainingTimeBarracks": 0.2541865828329001
        }
      },
      {
        "level": 15,
        "time": 29077,
        "wood": 19965,
        "clay": 13310,
        "iron": 24720,
        "crop": 11410,
        "pop": 42,
        "cp": 15,
        "effects": {
          "trainingTimeBarracks": 0.2287679245496101
        }
      },
      {
        "level": 16,
        "time": 34029,
        "wood": 25555,
        "clay": 17035,
        "iron": 31640,
        "crop": 14605,
        "pop": 46,
        "cp": 18,
        "effects": {
          "trainingTimeBarracks": 0.20589113209464907
        }
      },
      {
        "level": 17,
        "time": 39774,
        "wood": 32710,
        "clay": 21810,
        "iron": 40500,
        "crop": 18690,
        "pop": 50,
        "cp": 22,
        "effects": {
          "trainingTimeBarracks": 0.18530201888518416
        }
      },
      {
        "level": 18,
        "time": 46437,
        "wood": 41870,
        "clay": 27915,
        "iron": 51840,
        "crop": 23925,
        "pop": 54,
        "cp": 27,
        "effects": {
          "trainingTimeBarracks": 0.16677181699666577
        }
      },
      {
        "level": 19,
        "time": 54167,
        "wood": 53595,
        "clay": 35730,
        "iron": 66355,
        "crop": 30625,
        "pop": 58,
        "cp": 32,
        "effects": {
          "trainingTimeBarracks": 0.15009463529699918
        }
      },
      {
        "level": 20,
        "time": 63134,
        "wood": 68600,
        "clay": 45735,
        "iron": 84935,
        "crop": 39200,
        "pop": 62,
        "cp": 38,
        "effects": {
          "trainingTimeBarracks": 0.13508517176729928
        }
      }
    ]
  },
  {
    "gid": 30,
    "slug": "great-stable",
    "name": "Great Stable",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 2,
    "effects": [
      "trainingTimeStable"
    ],
    "prerequisites": [
      {
        "type": "City"
      },
      {
        "type": "Building",
        "gid": [
          20
        ],
        "level": 20
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2200,
        "wood": 780,
        "clay": 420,
        "iron": 660,
        "crop": 300,
        "pop": 5,
        "cp": 2,
        "effects": {
          "trainingTimeStable": 1
        }
      },
      {
        "level": 2,
        "time": 2852,
        "wood": 1000,
        "clay": 540,
        "iron": 845,
        "crop": 385,
        "pop": 8,
        "cp": 3,
        "effects": {
          "trainingTimeStable": 0.9
        }
      },
      {
        "level": 3,
        "time": 3608,
        "wood": 1280,
        "clay": 690,
        "iron": 1080,
        "crop": 490,
        "pop": 11,
        "cp": 3,
        "effects": {
          "trainingTimeStable": 0.81
        }
      },
      {
        "level": 4,
        "time": 4486,
        "wood": 1635,
        "clay": 880,
        "iron": 1385,
        "crop": 630,
        "pop": 14,
        "cp": 4,
        "effects": {
          "trainingTimeStable": 0.7290000000000001
        }
      },
      {
        "level": 5,
        "time": 5503,
        "wood": 2095,
        "clay": 1125,
        "iron": 1770,
        "crop": 805,
        "pop": 17,
        "cp": 5,
        "effects": {
          "trainingTimeStable": 0.6561000000000001
        }
      },
      {
        "level": 6,
        "time": 6684,
        "wood": 2680,
        "clay": 1445,
        "iron": 2270,
        "crop": 1030,
        "pop": 20,
        "cp": 6,
        "effects": {
          "trainingTimeStable": 0.5904900000000001
        }
      },
      {
        "level": 7,
        "time": 8053,
        "wood": 3430,
        "clay": 1845,
        "iron": 2905,
        "crop": 1320,
        "pop": 23,
        "cp": 7,
        "effects": {
          "trainingTimeStable": 0.531441
        }
      },
      {
        "level": 8,
        "time": 9642,
        "wood": 4390,
        "clay": 2365,
        "iron": 3715,
        "crop": 1690,
        "pop": 26,
        "cp": 9,
        "effects": {
          "trainingTimeStable": 0.4782969000000001
        }
      },
      {
        "level": 9,
        "time": 11485,
        "wood": 5620,
        "clay": 3025,
        "iron": 4755,
        "crop": 2160,
        "pop": 29,
        "cp": 10,
        "effects": {
          "trainingTimeStable": 0.4304672100000001
        }
      },
      {
        "level": 10,
        "time": 13622,
        "wood": 7195,
        "clay": 3875,
        "iron": 6085,
        "crop": 2765,
        "pop": 32,
        "cp": 12,
        "effects": {
          "trainingTimeStable": 0.3874204890000001
        }
      },
      {
        "level": 11,
        "time": 16102,
        "wood": 9210,
        "clay": 4960,
        "iron": 7790,
        "crop": 3540,
        "pop": 36,
        "cp": 15,
        "effects": {
          "trainingTimeStable": 0.3486784401000001
        }
      },
      {
        "level": 12,
        "time": 18978,
        "wood": 11785,
        "clay": 6345,
        "iron": 9975,
        "crop": 4535,
        "pop": 40,
        "cp": 18,
        "effects": {
          "trainingTimeStable": 0.31381059609000006
        }
      },
      {
        "level": 13,
        "time": 22314,
        "wood": 15085,
        "clay": 8125,
        "iron": 12765,
        "crop": 5805,
        "pop": 44,
        "cp": 21,
        "effects": {
          "trainingTimeStable": 0.2824295364810001
        }
      },
      {
        "level": 14,
        "time": 26185,
        "wood": 19310,
        "clay": 10400,
        "iron": 16340,
        "crop": 7430,
        "pop": 48,
        "cp": 26,
        "effects": {
          "trainingTimeStable": 0.2541865828329001
        }
      },
      {
        "level": 15,
        "time": 30674,
        "wood": 24720,
        "clay": 13310,
        "iron": 20915,
        "crop": 9505,
        "pop": 52,
        "cp": 31,
        "effects": {
          "trainingTimeStable": 0.2287679245496101
        }
      },
      {
        "level": 16,
        "time": 35882,
        "wood": 31640,
        "clay": 17035,
        "iron": 26775,
        "crop": 12170,
        "pop": 56,
        "cp": 37,
        "effects": {
          "trainingTimeStable": 0.20589113209464907
        }
      },
      {
        "level": 17,
        "time": 41923,
        "wood": 40500,
        "clay": 21810,
        "iron": 34270,
        "crop": 15575,
        "pop": 60,
        "cp": 44,
        "effects": {
          "trainingTimeStable": 0.18530201888518416
        }
      },
      {
        "level": 18,
        "time": 48931,
        "wood": 51840,
        "clay": 27915,
        "iron": 43865,
        "crop": 19940,
        "pop": 64,
        "cp": 53,
        "effects": {
          "trainingTimeStable": 0.16677181699666577
        }
      },
      {
        "level": 19,
        "time": 57060,
        "wood": 66355,
        "clay": 35730,
        "iron": 56145,
        "crop": 25520,
        "pop": 68,
        "cp": 64,
        "effects": {
          "trainingTimeStable": 0.15009463529699918
        }
      },
      {
        "level": 20,
        "time": 66489,
        "wood": 84935,
        "clay": 45735,
        "iron": 71870,
        "crop": 32665,
        "pop": 72,
        "cp": 77,
        "effects": {
          "trainingTimeStable": 0.13508517176729928
        }
      }
    ]
  },
  {
    "gid": 31,
    "slug": "watch-tower",
    "name": "Watch Tower",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "defBonus",
      "defFlat"
    ],
    "prerequisites": [],
    "levels": [
      {
        "level": 1,
        "wood": 160,
        "clay": 100,
        "iron": 80,
        "crop": 60,
        "pop": 0,
        "cp": 1,
        "time": 2000,
        "effects": {}
      },
      {
        "level": 2,
        "wood": 205,
        "clay": 130,
        "iron": 100,
        "crop": 75,
        "pop": 0,
        "cp": 1,
        "time": 2620,
        "effects": {}
      },
      {
        "level": 3,
        "wood": 260,
        "clay": 165,
        "iron": 130,
        "crop": 100,
        "pop": 0,
        "cp": 2,
        "time": 3339,
        "effects": {}
      },
      {
        "level": 4,
        "wood": 335,
        "clay": 210,
        "iron": 170,
        "crop": 125,
        "pop": 0,
        "cp": 2,
        "time": 4173,
        "effects": {}
      },
      {
        "level": 5,
        "wood": 430,
        "clay": 270,
        "iron": 215,
        "crop": 160,
        "pop": 0,
        "cp": 2,
        "time": 5141,
        "effects": {}
      },
      {
        "level": 6,
        "wood": 550,
        "clay": 345,
        "iron": 275,
        "crop": 205,
        "pop": 1,
        "cp": 3,
        "time": 6264,
        "effects": {}
      },
      {
        "level": 7,
        "wood": 705,
        "clay": 440,
        "iron": 350,
        "crop": 265,
        "pop": 1,
        "cp": 4,
        "time": 7566,
        "effects": {}
      },
      {
        "level": 8,
        "wood": 900,
        "clay": 565,
        "iron": 450,
        "crop": 340,
        "pop": 1,
        "cp": 4,
        "time": 9077,
        "effects": {}
      },
      {
        "level": 9,
        "wood": 1155,
        "clay": 720,
        "iron": 575,
        "crop": 430,
        "pop": 1,
        "cp": 5,
        "time": 10829,
        "effects": {}
      },
      {
        "level": 10,
        "wood": 1475,
        "clay": 920,
        "iron": 740,
        "crop": 555,
        "pop": 1,
        "cp": 6,
        "time": 12861,
        "effects": {}
      },
      {
        "level": 11,
        "wood": 1890,
        "clay": 1180,
        "iron": 945,
        "crop": 710,
        "pop": 1,
        "cp": 7,
        "time": 15219,
        "effects": {}
      },
      {
        "level": 12,
        "wood": 2420,
        "clay": 1510,
        "iron": 1210,
        "crop": 905,
        "pop": 1,
        "cp": 9,
        "time": 17954,
        "effects": {}
      },
      {
        "level": 13,
        "wood": 3095,
        "clay": 1935,
        "iron": 1545,
        "crop": 1160,
        "pop": 1,
        "cp": 11,
        "time": 21127,
        "effects": {}
      },
      {
        "level": 14,
        "wood": 3960,
        "clay": 2475,
        "iron": 1980,
        "crop": 1485,
        "pop": 1,
        "cp": 13,
        "time": 24807,
        "effects": {}
      },
      {
        "level": 15,
        "wood": 5070,
        "clay": 3170,
        "iron": 2535,
        "crop": 1900,
        "pop": 1,
        "cp": 15,
        "time": 29077,
        "effects": {}
      },
      {
        "level": 16,
        "wood": 6490,
        "clay": 4055,
        "iron": 3245,
        "crop": 2435,
        "pop": 2,
        "cp": 18,
        "time": 34029,
        "effects": {}
      },
      {
        "level": 17,
        "wood": 8310,
        "clay": 5190,
        "iron": 4155,
        "crop": 3115,
        "pop": 2,
        "cp": 22,
        "time": 39774,
        "effects": {}
      },
      {
        "level": 18,
        "wood": 10635,
        "clay": 6645,
        "iron": 5315,
        "crop": 3990,
        "pop": 2,
        "cp": 27,
        "time": 46437,
        "effects": {}
      },
      {
        "level": 19,
        "wood": 13610,
        "clay": 8505,
        "iron": 6805,
        "crop": 5105,
        "pop": 2,
        "cp": 32,
        "time": 54167,
        "effects": {}
      },
      {
        "level": 20,
        "wood": 17420,
        "clay": 10890,
        "iron": 8710,
        "crop": 6535,
        "pop": 2,
        "cp": 38,
        "time": 63134,
        "effects": {}
      }
    ]
  },
  {
    "gid": 34,
    "slug": "stonemasons-lodge",
    "name": "Stonemason's Lodge",
    "category": "Infrastructure",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "durability"
    ],
    "prerequisites": [
      {
        "type": "Capital"
      },
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 5
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2200,
        "wood": 155,
        "clay": 130,
        "iron": 125,
        "crop": 70,
        "pop": 2,
        "cp": 1,
        "effects": {
          "durability": 0.1
        }
      },
      {
        "level": 2,
        "time": 3152,
        "wood": 200,
        "clay": 165,
        "iron": 160,
        "crop": 90,
        "pop": 3,
        "cp": 1,
        "effects": {
          "durability": 0.2
        }
      },
      {
        "level": 3,
        "time": 4256,
        "wood": 255,
        "clay": 215,
        "iron": 205,
        "crop": 115,
        "pop": 4,
        "cp": 2,
        "effects": {
          "durability": 0.3
        }
      },
      {
        "level": 4,
        "time": 5537,
        "wood": 325,
        "clay": 275,
        "iron": 260,
        "crop": 145,
        "pop": 5,
        "cp": 2,
        "effects": {
          "durability": 0.4
        }
      },
      {
        "level": 5,
        "time": 7023,
        "wood": 415,
        "clay": 350,
        "iron": 335,
        "crop": 190,
        "pop": 6,
        "cp": 2,
        "effects": {
          "durability": 0.5
        }
      },
      {
        "level": 6,
        "time": 8747,
        "wood": 535,
        "clay": 445,
        "iron": 430,
        "crop": 240,
        "pop": 8,
        "cp": 3,
        "effects": {
          "durability": 0.6
        }
      },
      {
        "level": 7,
        "time": 10747,
        "wood": 680,
        "clay": 570,
        "iron": 550,
        "crop": 310,
        "pop": 10,
        "cp": 4,
        "effects": {
          "durability": 0.7
        }
      },
      {
        "level": 8,
        "time": 13066,
        "wood": 875,
        "clay": 730,
        "iron": 705,
        "crop": 395,
        "pop": 12,
        "cp": 4,
        "effects": {
          "durability": 0.8
        }
      },
      {
        "level": 9,
        "time": 15757,
        "wood": 1115,
        "clay": 935,
        "iron": 900,
        "crop": 505,
        "pop": 14,
        "cp": 5,
        "effects": {
          "durability": 0.9
        }
      },
      {
        "level": 10,
        "time": 18878,
        "wood": 1430,
        "clay": 1200,
        "iron": 1155,
        "crop": 645,
        "pop": 16,
        "cp": 6,
        "effects": {
          "durability": 1
        }
      },
      {
        "level": 11,
        "time": 22498,
        "wood": 1830,
        "clay": 1535,
        "iron": 1475,
        "crop": 825,
        "pop": 18,
        "cp": 7,
        "effects": {
          "durability": 1.1
        }
      },
      {
        "level": 12,
        "time": 26698,
        "wood": 2340,
        "clay": 1965,
        "iron": 1890,
        "crop": 1060,
        "pop": 20,
        "cp": 9,
        "effects": {
          "durability": 1.2
        }
      },
      {
        "level": 13,
        "time": 31569,
        "wood": 3000,
        "clay": 2515,
        "iron": 2420,
        "crop": 1355,
        "pop": 22,
        "cp": 11,
        "effects": {
          "durability": 1.3
        }
      },
      {
        "level": 14,
        "time": 37220,
        "wood": 3840,
        "clay": 3220,
        "iron": 3095,
        "crop": 1735,
        "pop": 24,
        "cp": 13,
        "effects": {
          "durability": 1.4
        }
      },
      {
        "level": 15,
        "time": 43776,
        "wood": 4910,
        "clay": 4120,
        "iron": 3960,
        "crop": 2220,
        "pop": 26,
        "cp": 15,
        "effects": {
          "durability": 1.5
        }
      },
      {
        "level": 16,
        "time": 51380,
        "wood": 6290,
        "clay": 5275,
        "iron": 5070,
        "crop": 2840,
        "pop": 29,
        "cp": 18,
        "effects": {
          "durability": 1.6
        }
      },
      {
        "level": 17,
        "time": 60201,
        "wood": 8050,
        "clay": 6750,
        "iron": 6490,
        "crop": 3635,
        "pop": 32,
        "cp": 22,
        "effects": {
          "durability": 1.7
        }
      },
      {
        "level": 18,
        "time": 70433,
        "wood": 10300,
        "clay": 8640,
        "iron": 8310,
        "crop": 4650,
        "pop": 35,
        "cp": 27,
        "effects": {
          "durability": 1.8
        }
      },
      {
        "level": 19,
        "time": 82302,
        "wood": 13185,
        "clay": 11060,
        "iron": 10635,
        "crop": 5955,
        "pop": 38,
        "cp": 32,
        "effects": {
          "durability": 1.9
        }
      },
      {
        "level": 20,
        "time": 96070,
        "wood": 16880,
        "clay": 14155,
        "iron": 13610,
        "crop": 7620,
        "pop": 41,
        "cp": 38,
        "effects": {
          "durability": 2
        }
      }
    ]
  },
  {
    "gid": 35,
    "slug": "brewery",
    "name": "Stormbrew Works",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 4,
    "effects": [
      "offBoost",
      "partyTime"
    ],
    "prerequisites": [
      {
        "type": "Capital"
      },
      {
        "type": "Building",
        "gid": [
          11
        ],
        "level": 20
      },
      {
        "type": "Building",
        "gid": [
          16
        ],
        "level": 10
      },
      {
        "type": "Tribe",
        "vid": [
          2
        ]
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 8000,
        "wood": 1460,
        "clay": 930,
        "iron": 1250,
        "crop": 1740,
        "pop": 6,
        "cp": 5,
        "effects": {
          "offBoost": 0.01,
          "partyTime": 259200
        }
      },
      {
        "level": 2,
        "time": 9880,
        "wood": 1870,
        "clay": 1190,
        "iron": 1600,
        "crop": 2225,
        "pop": 9,
        "cp": 6,
        "effects": {
          "offBoost": 0.02,
          "partyTime": 259200
        }
      },
      {
        "level": 3,
        "time": 12061,
        "wood": 2390,
        "clay": 1525,
        "iron": 2050,
        "crop": 2850,
        "pop": 12,
        "cp": 7,
        "effects": {
          "offBoost": 0.03,
          "partyTime": 259200
        }
      },
      {
        "level": 4,
        "time": 14591,
        "wood": 3060,
        "clay": 1950,
        "iron": 2620,
        "crop": 3650,
        "pop": 15,
        "cp": 8,
        "effects": {
          "offBoost": 0.04,
          "partyTime": 259200
        }
      },
      {
        "level": 5,
        "time": 17525,
        "wood": 3920,
        "clay": 2495,
        "iron": 3355,
        "crop": 4670,
        "pop": 18,
        "cp": 10,
        "effects": {
          "offBoost": 0.05,
          "partyTime": 259200
        }
      },
      {
        "level": 6,
        "time": 20929,
        "wood": 5015,
        "clay": 3195,
        "iron": 4295,
        "crop": 5980,
        "pop": 22,
        "cp": 12,
        "effects": {
          "offBoost": 0.06,
          "partyTime": 259200
        }
      },
      {
        "level": 7,
        "time": 24878,
        "wood": 6420,
        "clay": 4090,
        "iron": 5500,
        "crop": 7655,
        "pop": 26,
        "cp": 14,
        "effects": {
          "offBoost": 0.07,
          "partyTime": 259200
        }
      },
      {
        "level": 8,
        "time": 29458,
        "wood": 8220,
        "clay": 5235,
        "iron": 7035,
        "crop": 9795,
        "pop": 30,
        "cp": 17,
        "effects": {
          "offBoost": 0.08,
          "partyTime": 259200
        }
      },
      {
        "level": 9,
        "time": 34771,
        "wood": 10520,
        "clay": 6700,
        "iron": 9005,
        "crop": 12540,
        "pop": 34,
        "cp": 21,
        "effects": {
          "offBoost": 0.09,
          "partyTime": 259200
        }
      },
      {
        "level": 10,
        "time": 40935,
        "wood": 13465,
        "clay": 8580,
        "iron": 11530,
        "crop": 16050,
        "pop": 38,
        "cp": 25,
        "effects": {
          "offBoost": 0.1,
          "partyTime": 259200
        }
      },
      {
        "level": 11,
        "time": 48084,
        "wood": 17235,
        "clay": 10980,
        "iron": 14755,
        "crop": 20540,
        "pop": 42,
        "cp": 30,
        "effects": {
          "offBoost": 0.11,
          "partyTime": 259200
        }
      },
      {
        "level": 12,
        "time": 56378,
        "wood": 22065,
        "clay": 14055,
        "iron": 18890,
        "crop": 26295,
        "pop": 46,
        "cp": 36,
        "effects": {
          "offBoost": 0.12,
          "partyTime": 259200
        }
      },
      {
        "level": 13,
        "time": 65998,
        "wood": 28240,
        "clay": 17990,
        "iron": 24180,
        "crop": 33655,
        "pop": 50,
        "cp": 43,
        "effects": {
          "offBoost": 0.13,
          "partyTime": 259200
        }
      },
      {
        "level": 14,
        "time": 77158,
        "wood": 36150,
        "clay": 23025,
        "iron": 30950,
        "crop": 43080,
        "pop": 54,
        "cp": 51,
        "effects": {
          "offBoost": 0.14,
          "partyTime": 259200
        }
      },
      {
        "level": 15,
        "time": 90103,
        "wood": 46270,
        "clay": 29475,
        "iron": 39615,
        "crop": 55145,
        "pop": 58,
        "cp": 62,
        "effects": {
          "offBoost": 0.15,
          "partyTime": 259200
        }
      },
      {
        "level": 16,
        "time": 105120,
        "wood": 59225,
        "clay": 37725,
        "iron": 50705,
        "crop": 70585,
        "pop": 63,
        "cp": 74,
        "effects": {
          "offBoost": 0.16,
          "partyTime": 259200
        }
      },
      {
        "level": 17,
        "time": 122539,
        "wood": 75810,
        "clay": 48290,
        "iron": 64905,
        "crop": 90345,
        "pop": 68,
        "cp": 89,
        "effects": {
          "offBoost": 0.17,
          "partyTime": 259200
        }
      },
      {
        "level": 18,
        "time": 142745,
        "wood": 97035,
        "clay": 61810,
        "iron": 83075,
        "crop": 115645,
        "pop": 73,
        "cp": 106,
        "effects": {
          "offBoost": 0.18,
          "partyTime": 259200
        }
      },
      {
        "level": 19,
        "time": 166185,
        "wood": 124205,
        "clay": 79115,
        "iron": 106340,
        "crop": 148025,
        "pop": 78,
        "cp": 128,
        "effects": {
          "offBoost": 0.19,
          "partyTime": 259200
        }
      },
      {
        "level": 20,
        "time": 193374,
        "wood": 158980,
        "clay": 101270,
        "iron": 136115,
        "crop": 189470,
        "pop": 83,
        "cp": 153,
        "effects": {
          "offBoost": 0.2,
          "partyTime": 259200
        }
      }
    ]
  },
  {
    "gid": 36,
    "slug": "trapper",
    "name": "Trapper",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "traps"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          16
        ],
        "level": 1
      },
      {
        "type": "Tribe",
        "vid": [
          3
        ]
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2000,
        "wood": 80,
        "clay": 120,
        "iron": 70,
        "crop": 90,
        "pop": 4,
        "cp": 1,
        "effects": {
          "traps": 10
        }
      },
      {
        "level": 2,
        "time": 2320,
        "wood": 105,
        "clay": 160,
        "iron": 95,
        "crop": 120,
        "pop": 6,
        "cp": 1,
        "effects": {
          "traps": 22
        }
      },
      {
        "level": 3,
        "time": 2691,
        "wood": 140,
        "clay": 210,
        "iron": 125,
        "crop": 160,
        "pop": 8,
        "cp": 2,
        "effects": {
          "traps": 35
        }
      },
      {
        "level": 4,
        "time": 3122,
        "wood": 190,
        "clay": 280,
        "iron": 165,
        "crop": 210,
        "pop": 10,
        "cp": 2,
        "effects": {
          "traps": 49
        }
      },
      {
        "level": 5,
        "time": 3621,
        "wood": 250,
        "clay": 375,
        "iron": 220,
        "crop": 280,
        "pop": 12,
        "cp": 2,
        "effects": {
          "traps": 64
        }
      },
      {
        "level": 6,
        "time": 4201,
        "wood": 335,
        "clay": 500,
        "iron": 290,
        "crop": 375,
        "pop": 15,
        "cp": 3,
        "effects": {
          "traps": 80
        }
      },
      {
        "level": 7,
        "time": 4873,
        "wood": 445,
        "clay": 665,
        "iron": 385,
        "crop": 500,
        "pop": 18,
        "cp": 4,
        "effects": {
          "traps": 97
        }
      },
      {
        "level": 8,
        "time": 5652,
        "wood": 590,
        "clay": 885,
        "iron": 515,
        "crop": 665,
        "pop": 21,
        "cp": 4,
        "effects": {
          "traps": 115
        }
      },
      {
        "level": 9,
        "time": 6557,
        "wood": 785,
        "clay": 1175,
        "iron": 685,
        "crop": 880,
        "pop": 24,
        "cp": 5,
        "effects": {
          "traps": 134
        }
      },
      {
        "level": 10,
        "time": 7606,
        "wood": 1040,
        "clay": 1565,
        "iron": 910,
        "crop": 1170,
        "pop": 27,
        "cp": 6,
        "effects": {
          "traps": 154
        }
      },
      {
        "level": 11,
        "time": 8823,
        "wood": 1385,
        "clay": 2080,
        "iron": 1210,
        "crop": 1560,
        "pop": 30,
        "cp": 7,
        "effects": {
          "traps": 175
        }
      },
      {
        "level": 12,
        "time": 10235,
        "wood": 1845,
        "clay": 2765,
        "iron": 1610,
        "crop": 2075,
        "pop": 33,
        "cp": 9,
        "effects": {
          "traps": 196
        }
      },
      {
        "level": 13,
        "time": 11872,
        "wood": 2450,
        "clay": 3675,
        "iron": 2145,
        "crop": 2755,
        "pop": 36,
        "cp": 11,
        "effects": {
          "traps": 218
        }
      },
      {
        "level": 14,
        "time": 13772,
        "wood": 3260,
        "clay": 4890,
        "iron": 2850,
        "crop": 3665,
        "pop": 39,
        "cp": 13,
        "effects": {
          "traps": 241
        }
      },
      {
        "level": 15,
        "time": 15975,
        "wood": 4335,
        "clay": 6505,
        "iron": 3795,
        "crop": 4875,
        "pop": 42,
        "cp": 15,
        "effects": {
          "traps": 265
        }
      },
      {
        "level": 16,
        "time": 18531,
        "wood": 5765,
        "clay": 8650,
        "iron": 5045,
        "crop": 6485,
        "pop": 46,
        "cp": 18,
        "effects": {
          "traps": 290
        }
      },
      {
        "level": 17,
        "time": 21496,
        "wood": 7670,
        "clay": 11505,
        "iron": 6710,
        "crop": 8625,
        "pop": 50,
        "cp": 22,
        "effects": {
          "traps": 316
        }
      },
      {
        "level": 18,
        "time": 24935,
        "wood": 10200,
        "clay": 15300,
        "iron": 8925,
        "crop": 11475,
        "pop": 54,
        "cp": 27,
        "effects": {
          "traps": 343
        }
      },
      {
        "level": 19,
        "time": 28925,
        "wood": 13565,
        "clay": 20345,
        "iron": 11870,
        "crop": 15260,
        "pop": 58,
        "cp": 32,
        "effects": {
          "traps": 371
        }
      },
      {
        "level": 20,
        "time": 33553,
        "wood": 18040,
        "clay": 27060,
        "iron": 15785,
        "crop": 20295,
        "pop": 62,
        "cp": 38,
        "effects": {
          "traps": 400
        }
      }
    ]
  },
  {
    "gid": 37,
    "slug": "expedition-camp",
    "name": "Expedition Camp",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [],
    "prerequisites": [
      {
        "type": "Building",
        "gid": 15,
        "level": 3
      },
      {
        "type": "Building",
        "gid": 16,
        "level": 1
      }
    ],
    "levels": [
      {
        "level": 1,
        "wood": 700,
        "clay": 670,
        "iron": 700,
        "crop": 240,
        "pop": 2,
        "cp": 1,
        "time": 2300,
        "effects": {}
      },
      {
        "level": 2,
        "wood": 930,
        "clay": 890,
        "iron": 930,
        "crop": 320,
        "pop": 3,
        "cp": 1,
        "time": 2668,
        "effects": {}
      },
      {
        "level": 3,
        "wood": 1240,
        "clay": 1185,
        "iron": 1240,
        "crop": 425,
        "pop": 4,
        "cp": 2,
        "time": 3095,
        "effects": {}
      },
      {
        "level": 4,
        "wood": 1645,
        "clay": 1575,
        "iron": 1645,
        "crop": 565,
        "pop": 5,
        "cp": 2,
        "time": 3590,
        "effects": {}
      },
      {
        "level": 5,
        "wood": 2190,
        "clay": 2095,
        "iron": 2190,
        "crop": 750,
        "pop": 6,
        "cp": 2,
        "time": 4164,
        "effects": {}
      },
      {
        "level": 6,
        "wood": 2915,
        "clay": 2790,
        "iron": 2915,
        "crop": 1000,
        "pop": 8,
        "cp": 3,
        "time": 4831,
        "effects": {}
      },
      {
        "level": 7,
        "wood": 3875,
        "clay": 3710,
        "iron": 3875,
        "crop": 1330,
        "pop": 10,
        "cp": 4,
        "time": 5604,
        "effects": {}
      },
      {
        "level": 8,
        "wood": 5155,
        "clay": 4930,
        "iron": 5155,
        "crop": 1765,
        "pop": 12,
        "cp": 4,
        "time": 6500,
        "effects": {}
      },
      {
        "level": 9,
        "wood": 6855,
        "clay": 6560,
        "iron": 6855,
        "crop": 2350,
        "pop": 14,
        "cp": 5,
        "time": 7540,
        "effects": {}
      },
      {
        "level": 10,
        "wood": 9115,
        "clay": 8725,
        "iron": 9115,
        "crop": 3125,
        "pop": 16,
        "cp": 6,
        "time": 8747,
        "effects": {}
      },
      {
        "level": 11,
        "wood": 12125,
        "clay": 11605,
        "iron": 12125,
        "crop": 4155,
        "pop": 18,
        "cp": 7,
        "time": 10146,
        "effects": {}
      },
      {
        "level": 12,
        "wood": 16125,
        "clay": 15435,
        "iron": 16125,
        "crop": 5530,
        "pop": 20,
        "cp": 9,
        "time": 11770,
        "effects": {}
      },
      {
        "level": 13,
        "wood": 21445,
        "clay": 20525,
        "iron": 21445,
        "crop": 7350,
        "pop": 22,
        "cp": 11,
        "time": 13653,
        "effects": {}
      },
      {
        "level": 14,
        "wood": 28520,
        "clay": 27300,
        "iron": 28520,
        "crop": 9780,
        "pop": 24,
        "cp": 13,
        "time": 15837,
        "effects": {}
      },
      {
        "level": 15,
        "wood": 37935,
        "clay": 36310,
        "iron": 37935,
        "crop": 13005,
        "pop": 26,
        "cp": 15,
        "time": 18371,
        "effects": {}
      },
      {
        "level": 16,
        "wood": 50450,
        "clay": 48290,
        "iron": 50450,
        "crop": 17300,
        "pop": 29,
        "cp": 18,
        "time": 21311,
        "effects": {}
      },
      {
        "level": 17,
        "wood": 67100,
        "clay": 64225,
        "iron": 67100,
        "crop": 23005,
        "pop": 32,
        "cp": 22,
        "time": 24720,
        "effects": {}
      },
      {
        "level": 18,
        "wood": 89245,
        "clay": 85420,
        "iron": 89245,
        "crop": 30600,
        "pop": 35,
        "cp": 27,
        "time": 28676,
        "effects": {}
      },
      {
        "level": 19,
        "wood": 118695,
        "clay": 113605,
        "iron": 118695,
        "crop": 40695,
        "pop": 38,
        "cp": 32,
        "time": 33264,
        "effects": {}
      },
      {
        "level": 20,
        "wood": 157865,
        "clay": 151095,
        "iron": 157865,
        "crop": 54125,
        "pop": 41,
        "cp": 38,
        "time": 38586,
        "effects": {}
      }
    ]
  },
  {
    "gid": 38,
    "slug": "great-warehouse",
    "name": "Great Warehouse",
    "category": "Infrastructure",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "storageWarehouse"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 10
      },
      {
        "type": "WonderOfTheWorldVillage"
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 9000,
        "wood": 650,
        "clay": 800,
        "iron": 450,
        "crop": 200,
        "pop": 1,
        "cp": 1,
        "effects": {
          "storageWarehouse": 3600
        }
      },
      {
        "level": 2,
        "time": 10740,
        "wood": 830,
        "clay": 1025,
        "iron": 575,
        "crop": 255,
        "pop": 2,
        "cp": 1,
        "effects": {
          "storageWarehouse": 5100
        }
      },
      {
        "level": 3,
        "time": 12758,
        "wood": 1065,
        "clay": 1310,
        "iron": 735,
        "crop": 330,
        "pop": 3,
        "cp": 2,
        "effects": {
          "storageWarehouse": 6900
        }
      },
      {
        "level": 4,
        "time": 15100,
        "wood": 1365,
        "clay": 1680,
        "iron": 945,
        "crop": 420,
        "pop": 4,
        "cp": 2,
        "effects": {
          "storageWarehouse": 9300
        }
      },
      {
        "level": 5,
        "time": 17816,
        "wood": 1745,
        "clay": 2145,
        "iron": 1210,
        "crop": 535,
        "pop": 5,
        "cp": 2,
        "effects": {
          "storageWarehouse": 12000
        }
      },
      {
        "level": 6,
        "time": 20966,
        "wood": 2235,
        "clay": 2750,
        "iron": 1545,
        "crop": 685,
        "pop": 6,
        "cp": 3,
        "effects": {
          "storageWarehouse": 15000
        }
      },
      {
        "level": 7,
        "time": 24621,
        "wood": 2860,
        "clay": 3520,
        "iron": 1980,
        "crop": 880,
        "pop": 7,
        "cp": 4,
        "effects": {
          "storageWarehouse": 18900
        }
      },
      {
        "level": 8,
        "time": 28860,
        "wood": 3660,
        "clay": 4505,
        "iron": 2535,
        "crop": 1125,
        "pop": 8,
        "cp": 4,
        "effects": {
          "storageWarehouse": 23100
        }
      },
      {
        "level": 9,
        "time": 33778,
        "wood": 4685,
        "clay": 5765,
        "iron": 3245,
        "crop": 1440,
        "pop": 9,
        "cp": 5,
        "effects": {
          "storageWarehouse": 28800
        }
      },
      {
        "level": 10,
        "time": 39482,
        "wood": 5995,
        "clay": 7380,
        "iron": 4150,
        "crop": 1845,
        "pop": 10,
        "cp": 6,
        "effects": {
          "storageWarehouse": 36000
        }
      },
      {
        "level": 11,
        "time": 46099,
        "wood": 7675,
        "clay": 9445,
        "iron": 5315,
        "crop": 2360,
        "pop": 12,
        "cp": 7,
        "effects": {
          "storageWarehouse": 43200
        }
      },
      {
        "level": 12,
        "time": 53775,
        "wood": 9825,
        "clay": 12090,
        "iron": 6800,
        "crop": 3020,
        "pop": 14,
        "cp": 9,
        "effects": {
          "storageWarehouse": 54000
        }
      },
      {
        "level": 13,
        "time": 62679,
        "wood": 12575,
        "clay": 15475,
        "iron": 8705,
        "crop": 3870,
        "pop": 16,
        "cp": 11,
        "effects": {
          "storageWarehouse": 66000
        }
      },
      {
        "level": 14,
        "time": 73008,
        "wood": 16095,
        "clay": 19805,
        "iron": 11140,
        "crop": 4950,
        "pop": 18,
        "cp": 13,
        "effects": {
          "storageWarehouse": 78000
        }
      },
      {
        "level": 15,
        "time": 84989,
        "wood": 20600,
        "clay": 25355,
        "iron": 14260,
        "crop": 6340,
        "pop": 20,
        "cp": 15,
        "effects": {
          "storageWarehouse": 96000
        }
      },
      {
        "level": 16,
        "time": 98888,
        "wood": 26365,
        "clay": 32450,
        "iron": 18255,
        "crop": 8115,
        "pop": 22,
        "cp": 18,
        "effects": {
          "storageWarehouse": 114000
        }
      },
      {
        "level": 17,
        "time": 115010,
        "wood": 33750,
        "clay": 41540,
        "iron": 23365,
        "crop": 10385,
        "pop": 24,
        "cp": 22,
        "effects": {
          "storageWarehouse": 135000
        }
      },
      {
        "level": 18,
        "time": 133711,
        "wood": 43200,
        "clay": 53170,
        "iron": 29910,
        "crop": 13290,
        "pop": 26,
        "cp": 27,
        "effects": {
          "storageWarehouse": 165000
        }
      },
      {
        "level": 19,
        "time": 155405,
        "wood": 55295,
        "clay": 68055,
        "iron": 38280,
        "crop": 17015,
        "pop": 28,
        "cp": 32,
        "effects": {
          "storageWarehouse": 198000
        }
      },
      {
        "level": 20,
        "time": 180570,
        "wood": 70780,
        "clay": 87110,
        "iron": 49000,
        "crop": 21780,
        "pop": 30,
        "cp": 38,
        "effects": {
          "storageWarehouse": 240000
        }
      }
    ]
  },
  {
    "gid": 39,
    "slug": "great-granary",
    "name": "Great Granary",
    "category": "Infrastructure",
    "maxLevel": 20,
    "cultureBase": 1,
    "effects": [
      "storageGranary"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 10
      },
      {
        "type": "WonderOfTheWorldVillage"
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 7000,
        "wood": 400,
        "clay": 500,
        "iron": 350,
        "crop": 100,
        "pop": 1,
        "cp": 1,
        "effects": {
          "storageGranary": 3600
        }
      },
      {
        "level": 2,
        "time": 8420,
        "wood": 510,
        "clay": 640,
        "iron": 450,
        "crop": 130,
        "pop": 2,
        "cp": 1,
        "effects": {
          "storageGranary": 5100
        }
      },
      {
        "level": 3,
        "time": 10067,
        "wood": 655,
        "clay": 820,
        "iron": 575,
        "crop": 165,
        "pop": 3,
        "cp": 2,
        "effects": {
          "storageGranary": 6900
        }
      },
      {
        "level": 4,
        "time": 11978,
        "wood": 840,
        "clay": 1050,
        "iron": 735,
        "crop": 210,
        "pop": 4,
        "cp": 2,
        "effects": {
          "storageGranary": 9300
        }
      },
      {
        "level": 5,
        "time": 14194,
        "wood": 1075,
        "clay": 1340,
        "iron": 940,
        "crop": 270,
        "pop": 5,
        "cp": 2,
        "effects": {
          "storageGranary": 12000
        }
      },
      {
        "level": 6,
        "time": 16766,
        "wood": 1375,
        "clay": 1720,
        "iron": 1205,
        "crop": 345,
        "pop": 6,
        "cp": 3,
        "effects": {
          "storageGranary": 15000
        }
      },
      {
        "level": 7,
        "time": 19748,
        "wood": 1760,
        "clay": 2200,
        "iron": 1540,
        "crop": 440,
        "pop": 7,
        "cp": 4,
        "effects": {
          "storageGranary": 18900
        }
      },
      {
        "level": 8,
        "time": 23208,
        "wood": 2250,
        "clay": 2815,
        "iron": 1970,
        "crop": 565,
        "pop": 8,
        "cp": 4,
        "effects": {
          "storageGranary": 23100
        }
      },
      {
        "level": 9,
        "time": 27221,
        "wood": 2880,
        "clay": 3605,
        "iron": 2520,
        "crop": 720,
        "pop": 9,
        "cp": 5,
        "effects": {
          "storageGranary": 28800
        }
      },
      {
        "level": 10,
        "time": 31876,
        "wood": 3690,
        "clay": 4610,
        "iron": 3230,
        "crop": 920,
        "pop": 10,
        "cp": 6,
        "effects": {
          "storageGranary": 36000
        }
      },
      {
        "level": 11,
        "time": 37276,
        "wood": 4720,
        "clay": 5905,
        "iron": 4130,
        "crop": 1180,
        "pop": 12,
        "cp": 7,
        "effects": {
          "storageGranary": 43200
        }
      },
      {
        "level": 12,
        "time": 43541,
        "wood": 6045,
        "clay": 7555,
        "iron": 5290,
        "crop": 1510,
        "pop": 14,
        "cp": 9,
        "effects": {
          "storageGranary": 54000
        }
      },
      {
        "level": 13,
        "time": 50807,
        "wood": 7735,
        "clay": 9670,
        "iron": 6770,
        "crop": 1935,
        "pop": 16,
        "cp": 11,
        "effects": {
          "storageGranary": 66000
        }
      },
      {
        "level": 14,
        "time": 59236,
        "wood": 9905,
        "clay": 12380,
        "iron": 8665,
        "crop": 2475,
        "pop": 18,
        "cp": 13,
        "effects": {
          "storageGranary": 78000
        }
      },
      {
        "level": 15,
        "time": 69014,
        "wood": 12675,
        "clay": 15845,
        "iron": 11090,
        "crop": 3170,
        "pop": 20,
        "cp": 15,
        "effects": {
          "storageGranary": 96000
        }
      },
      {
        "level": 16,
        "time": 80356,
        "wood": 16225,
        "clay": 20280,
        "iron": 14200,
        "crop": 4055,
        "pop": 22,
        "cp": 18,
        "effects": {
          "storageGranary": 114000
        }
      },
      {
        "level": 17,
        "time": 93514,
        "wood": 20770,
        "clay": 25960,
        "iron": 18175,
        "crop": 5190,
        "pop": 24,
        "cp": 22,
        "effects": {
          "storageGranary": 135000
        }
      },
      {
        "level": 18,
        "time": 108776,
        "wood": 26585,
        "clay": 33230,
        "iron": 23260,
        "crop": 6645,
        "pop": 26,
        "cp": 27,
        "effects": {
          "storageGranary": 165000
        }
      },
      {
        "level": 19,
        "time": 126480,
        "wood": 34030,
        "clay": 42535,
        "iron": 29775,
        "crop": 8505,
        "pop": 28,
        "cp": 32,
        "effects": {
          "storageGranary": 198000
        }
      },
      {
        "level": 20,
        "time": 147017,
        "wood": 43555,
        "clay": 54445,
        "iron": 38110,
        "crop": 10890,
        "pop": 30,
        "cp": 38,
        "effects": {
          "storageGranary": 240000
        }
      }
    ]
  },
  {
    "gid": 40,
    "slug": "wonder-of-the-world",
    "name": "Wonder Of The World",
    "category": "Infrastructure",
    "maxLevel": 100,
    "cultureBase": 0,
    "effects": [],
    "prerequisites": [
      {
        "type": "WonderOfTheWorldVillage"
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 18000,
        "wood": 66700,
        "clay": 69050,
        "iron": 72200,
        "crop": 13200,
        "pop": 1,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 2,
        "time": 18852,
        "wood": 68535,
        "clay": 70950,
        "iron": 74185,
        "crop": 13565,
        "pop": 2,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 3,
        "time": 19716,
        "wood": 70420,
        "clay": 72900,
        "iron": 76225,
        "crop": 13935,
        "pop": 3,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 4,
        "time": 20592,
        "wood": 72355,
        "clay": 74905,
        "iron": 78320,
        "crop": 14320,
        "pop": 4,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 5,
        "time": 21480,
        "wood": 74345,
        "clay": 76965,
        "iron": 80475,
        "crop": 14715,
        "pop": 5,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 6,
        "time": 22381,
        "wood": 76390,
        "clay": 79080,
        "iron": 82690,
        "crop": 15120,
        "pop": 6,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 7,
        "time": 23294,
        "wood": 78490,
        "clay": 81255,
        "iron": 84965,
        "crop": 15535,
        "pop": 7,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 8,
        "time": 24220,
        "wood": 80650,
        "clay": 83490,
        "iron": 87300,
        "crop": 15960,
        "pop": 8,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 9,
        "time": 25159,
        "wood": 82865,
        "clay": 85785,
        "iron": 89700,
        "crop": 16400,
        "pop": 9,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 10,
        "time": 26112,
        "wood": 85145,
        "clay": 88145,
        "iron": 92165,
        "crop": 16850,
        "pop": 10,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 11,
        "time": 27077,
        "wood": 87485,
        "clay": 90570,
        "iron": 94700,
        "crop": 17315,
        "pop": 12,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 12,
        "time": 28056,
        "wood": 89895,
        "clay": 93060,
        "iron": 97305,
        "crop": 17790,
        "pop": 14,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 13,
        "time": 29049,
        "wood": 92365,
        "clay": 95620,
        "iron": 99980,
        "crop": 18280,
        "pop": 16,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 14,
        "time": 30056,
        "wood": 94905,
        "clay": 98250,
        "iron": 102730,
        "crop": 18780,
        "pop": 18,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 15,
        "time": 31077,
        "wood": 97515,
        "clay": 100950,
        "iron": 105555,
        "crop": 19300,
        "pop": 20,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 16,
        "time": 32112,
        "wood": 100195,
        "clay": 103725,
        "iron": 108460,
        "crop": 19830,
        "pop": 22,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 17,
        "time": 33161,
        "wood": 102950,
        "clay": 106580,
        "iron": 111440,
        "crop": 20375,
        "pop": 24,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 18,
        "time": 34225,
        "wood": 105785,
        "clay": 109510,
        "iron": 114505,
        "crop": 20935,
        "pop": 26,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 19,
        "time": 35305,
        "wood": 108690,
        "clay": 112520,
        "iron": 117655,
        "crop": 21510,
        "pop": 28,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 20,
        "time": 36399,
        "wood": 111680,
        "clay": 115615,
        "iron": 120890,
        "crop": 22100,
        "pop": 30,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 21,
        "time": 37508,
        "wood": 114755,
        "clay": 118795,
        "iron": 124215,
        "crop": 22710,
        "pop": 33,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 22,
        "time": 38634,
        "wood": 117910,
        "clay": 122060,
        "iron": 127630,
        "crop": 23335,
        "pop": 36,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 23,
        "time": 39774,
        "wood": 121150,
        "clay": 125420,
        "iron": 131140,
        "crop": 23975,
        "pop": 39,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 24,
        "time": 40931,
        "wood": 124480,
        "clay": 128870,
        "iron": 134745,
        "crop": 24635,
        "pop": 42,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 25,
        "time": 42104,
        "wood": 127905,
        "clay": 132410,
        "iron": 138455,
        "crop": 25315,
        "pop": 45,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 26,
        "time": 43294,
        "wood": 131425,
        "clay": 136055,
        "iron": 142260,
        "crop": 26010,
        "pop": 48,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 27,
        "time": 44500,
        "wood": 135035,
        "clay": 139795,
        "iron": 146170,
        "crop": 26725,
        "pop": 51,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 28,
        "time": 45723,
        "wood": 138750,
        "clay": 143640,
        "iron": 150190,
        "crop": 27460,
        "pop": 54,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 29,
        "time": 46963,
        "wood": 142565,
        "clay": 147590,
        "iron": 154320,
        "crop": 28215,
        "pop": 57,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 30,
        "time": 48221,
        "wood": 146485,
        "clay": 151650,
        "iron": 158565,
        "crop": 28990,
        "pop": 60,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 31,
        "time": 49496,
        "wood": 150515,
        "clay": 155820,
        "iron": 162925,
        "crop": 29785,
        "pop": 64,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 32,
        "time": 50789,
        "wood": 154655,
        "clay": 160105,
        "iron": 167405,
        "crop": 30605,
        "pop": 68,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 33,
        "time": 52100,
        "wood": 158910,
        "clay": 164505,
        "iron": 172010,
        "crop": 31450,
        "pop": 72,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 34,
        "time": 53429,
        "wood": 163275,
        "clay": 169030,
        "iron": 176740,
        "crop": 32315,
        "pop": 76,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 35,
        "time": 54777,
        "wood": 167770,
        "clay": 173680,
        "iron": 181600,
        "crop": 33200,
        "pop": 80,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 36,
        "time": 56144,
        "wood": 172380,
        "clay": 178455,
        "iron": 186595,
        "crop": 34115,
        "pop": 84,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 37,
        "time": 57530,
        "wood": 177120,
        "clay": 183360,
        "iron": 191725,
        "crop": 35055,
        "pop": 88,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 38,
        "time": 58935,
        "wood": 181995,
        "clay": 188405,
        "iron": 197000,
        "crop": 36015,
        "pop": 92,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 39,
        "time": 60360,
        "wood": 186995,
        "clay": 193585,
        "iron": 202415,
        "crop": 37005,
        "pop": 96,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 40,
        "time": 61805,
        "wood": 192140,
        "clay": 198910,
        "iron": 207985,
        "crop": 38025,
        "pop": 100,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 41,
        "time": 63271,
        "wood": 197425,
        "clay": 204380,
        "iron": 213705,
        "crop": 39070,
        "pop": 105,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 42,
        "time": 64756,
        "wood": 202855,
        "clay": 210000,
        "iron": 219580,
        "crop": 40145,
        "pop": 110,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 43,
        "time": 66263,
        "wood": 208430,
        "clay": 215775,
        "iron": 225620,
        "crop": 41250,
        "pop": 115,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 44,
        "time": 67791,
        "wood": 214165,
        "clay": 221710,
        "iron": 231825,
        "crop": 42385,
        "pop": 120,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 45,
        "time": 69340,
        "wood": 220055,
        "clay": 227805,
        "iron": 238200,
        "crop": 43550,
        "pop": 125,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 46,
        "time": 70911,
        "wood": 226105,
        "clay": 234070,
        "iron": 244750,
        "crop": 44745,
        "pop": 130,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 47,
        "time": 72503,
        "wood": 232320,
        "clay": 240505,
        "iron": 251480,
        "crop": 45975,
        "pop": 135,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 48,
        "time": 74118,
        "wood": 238710,
        "clay": 247120,
        "iron": 258395,
        "crop": 47240,
        "pop": 140,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 49,
        "time": 75756,
        "wood": 245275,
        "clay": 253915,
        "iron": 265500,
        "crop": 48540,
        "pop": 145,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 50,
        "time": 77417,
        "wood": 252020,
        "clay": 260900,
        "iron": 272800,
        "crop": 49875,
        "pop": 150,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 51,
        "time": 79100,
        "wood": 258950,
        "clay": 268075,
        "iron": 280305,
        "crop": 51245,
        "pop": 156,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 52,
        "time": 80808,
        "wood": 266070,
        "clay": 275445,
        "iron": 288010,
        "crop": 52655,
        "pop": 162,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 53,
        "time": 82539,
        "wood": 273390,
        "clay": 283020,
        "iron": 295930,
        "crop": 54105,
        "pop": 168,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 54,
        "time": 84295,
        "wood": 280905,
        "clay": 290805,
        "iron": 304070,
        "crop": 55590,
        "pop": 174,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 55,
        "time": 86075,
        "wood": 288630,
        "clay": 298800,
        "iron": 312430,
        "crop": 57120,
        "pop": 180,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 56,
        "time": 87880,
        "wood": 296570,
        "clay": 307020,
        "iron": 321025,
        "crop": 58690,
        "pop": 186,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 57,
        "time": 89710,
        "wood": 304725,
        "clay": 315460,
        "iron": 329850,
        "crop": 60305,
        "pop": 192,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 58,
        "time": 91566,
        "wood": 313105,
        "clay": 324135,
        "iron": 338925,
        "crop": 61965,
        "pop": 198,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 59,
        "time": 93448,
        "wood": 321715,
        "clay": 333050,
        "iron": 348245,
        "crop": 63670,
        "pop": 204,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 60,
        "time": 95356,
        "wood": 330565,
        "clay": 342210,
        "iron": 357820,
        "crop": 65420,
        "pop": 210,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 61,
        "time": 97291,
        "wood": 339655,
        "clay": 351620,
        "iron": 367660,
        "crop": 67220,
        "pop": 217,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 62,
        "time": 99253,
        "wood": 348995,
        "clay": 361290,
        "iron": 377770,
        "crop": 69065,
        "pop": 224,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 63,
        "time": 101243,
        "wood": 358590,
        "clay": 371225,
        "iron": 388160,
        "crop": 70965,
        "pop": 231,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 64,
        "time": 103260,
        "wood": 368450,
        "clay": 381435,
        "iron": 398835,
        "crop": 72915,
        "pop": 238,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 65,
        "time": 105306,
        "wood": 378585,
        "clay": 391925,
        "iron": 409800,
        "crop": 74920,
        "pop": 245,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 66,
        "time": 107380,
        "wood": 388995,
        "clay": 402700,
        "iron": 421070,
        "crop": 76985,
        "pop": 252,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 67,
        "time": 109484,
        "wood": 399695,
        "clay": 413775,
        "iron": 432650,
        "crop": 79100,
        "pop": 259,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 68,
        "time": 111616,
        "wood": 410685,
        "clay": 425155,
        "iron": 444550,
        "crop": 81275,
        "pop": 266,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 69,
        "time": 113779,
        "wood": 421980,
        "clay": 436845,
        "iron": 456775,
        "crop": 83510,
        "pop": 273,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 70,
        "time": 115972,
        "wood": 433585,
        "clay": 448860,
        "iron": 469335,
        "crop": 85805,
        "pop": 280,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 71,
        "time": 118195,
        "wood": 445505,
        "clay": 461205,
        "iron": 482240,
        "crop": 88165,
        "pop": 288,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 72,
        "time": 120450,
        "wood": 457760,
        "clay": 473885,
        "iron": 495505,
        "crop": 90590,
        "pop": 296,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 73,
        "time": 122737,
        "wood": 470345,
        "clay": 486920,
        "iron": 509130,
        "crop": 93080,
        "pop": 304,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 74,
        "time": 125055,
        "wood": 483280,
        "clay": 500310,
        "iron": 523130,
        "crop": 95640,
        "pop": 312,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 75,
        "time": 127406,
        "wood": 496570,
        "clay": 514065,
        "iron": 537520,
        "crop": 98270,
        "pop": 320,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 76,
        "time": 129789,
        "wood": 510225,
        "clay": 528205,
        "iron": 552300,
        "crop": 100975,
        "pop": 328,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 77,
        "time": 132206,
        "wood": 524260,
        "clay": 542730,
        "iron": 567490,
        "crop": 103750,
        "pop": 336,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 78,
        "time": 134657,
        "wood": 538675,
        "clay": 557655,
        "iron": 583095,
        "crop": 106605,
        "pop": 344,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 79,
        "time": 137142,
        "wood": 553490,
        "clay": 572990,
        "iron": 599130,
        "crop": 109535,
        "pop": 352,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 80,
        "time": 139662,
        "wood": 568710,
        "clay": 588745,
        "iron": 615605,
        "crop": 112550,
        "pop": 360,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 81,
        "time": 142218,
        "wood": 584350,
        "clay": 604935,
        "iron": 632535,
        "crop": 115645,
        "pop": 369,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 82,
        "time": 144809,
        "wood": 600420,
        "clay": 621575,
        "iron": 649930,
        "crop": 118825,
        "pop": 378,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 83,
        "time": 147436,
        "wood": 616930,
        "clay": 638665,
        "iron": 667800,
        "crop": 122090,
        "pop": 387,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 84,
        "time": 150100,
        "wood": 633895,
        "clay": 656230,
        "iron": 686165,
        "crop": 125450,
        "pop": 396,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 85,
        "time": 152802,
        "wood": 651330,
        "clay": 674275,
        "iron": 705035,
        "crop": 128900,
        "pop": 405,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 86,
        "time": 155541,
        "wood": 669240,
        "clay": 692820,
        "iron": 724425,
        "crop": 132445,
        "pop": 414,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 87,
        "time": 158318,
        "wood": 687645,
        "clay": 711870,
        "iron": 744345,
        "crop": 136085,
        "pop": 423,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 88,
        "time": 161135,
        "wood": 706555,
        "clay": 731445,
        "iron": 764815,
        "crop": 139830,
        "pop": 432,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 89,
        "time": 163991,
        "wood": 725985,
        "clay": 751560,
        "iron": 785850,
        "crop": 143675,
        "pop": 441,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 90,
        "time": 166887,
        "wood": 745950,
        "clay": 772230,
        "iron": 807460,
        "crop": 147625,
        "pop": 450,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 91,
        "time": 169823,
        "wood": 766460,
        "clay": 793465,
        "iron": 829665,
        "crop": 151685,
        "pop": 460,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 92,
        "time": 172800,
        "wood": 787540,
        "clay": 815285,
        "iron": 852480,
        "crop": 155855,
        "pop": 470,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 93,
        "time": 175820,
        "wood": 809195,
        "clay": 837705,
        "iron": 875920,
        "crop": 160140,
        "pop": 480,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 94,
        "time": 178881,
        "wood": 831450,
        "clay": 860745,
        "iron": 900010,
        "crop": 164545,
        "pop": 490,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 95,
        "time": 181985,
        "wood": 854315,
        "clay": 884415,
        "iron": 924760,
        "crop": 169070,
        "pop": 500,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 96,
        "time": 185133,
        "wood": 877810,
        "clay": 908735,
        "iron": 950190,
        "crop": 173720,
        "pop": 510,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 97,
        "time": 188325,
        "wood": 901950,
        "clay": 933725,
        "iron": 976320,
        "crop": 178495,
        "pop": 520,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 98,
        "time": 191562,
        "wood": 926750,
        "clay": 959405,
        "iron": 1003170,
        "crop": 183405,
        "pop": 530,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 99,
        "time": 194844,
        "wood": 952235,
        "clay": 985785,
        "iron": 1030760,
        "crop": 188450,
        "pop": 540,
        "cp": 0,
        "effects": {}
      },
      {
        "level": 100,
        "time": 198171,
        "wood": 978425,
        "clay": 1012895,
        "iron": 1059105,
        "crop": 193630,
        "pop": 550,
        "cp": 0,
        "effects": {}
      }
    ]
  },
  {
    "gid": 41,
    "slug": "horse-drinking-trough",
    "name": "Rider's Wells",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 3,
    "effects": [
      "trainingTimeStable",
      "reduceSupply"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          16
        ],
        "level": 10
      },
      {
        "type": "Building",
        "gid": [
          20
        ],
        "level": 20
      },
      {
        "type": "Tribe",
        "vid": [
          1
        ]
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 2200,
        "wood": 780,
        "clay": 420,
        "iron": 660,
        "crop": 540,
        "pop": 5,
        "cp": 4,
        "effects": {
          "trainingTimeStable": 0.99,
          "reduceSupply": null
        }
      },
      {
        "level": 2,
        "time": 3152,
        "wood": 1000,
        "clay": 540,
        "iron": 845,
        "crop": 690,
        "pop": 8,
        "cp": 4,
        "effects": {
          "trainingTimeStable": 0.98,
          "reduceSupply": null
        }
      },
      {
        "level": 3,
        "time": 4256,
        "wood": 1280,
        "clay": 690,
        "iron": 1080,
        "crop": 885,
        "pop": 11,
        "cp": 5,
        "effects": {
          "trainingTimeStable": 0.97,
          "reduceSupply": null
        }
      },
      {
        "level": 4,
        "time": 5537,
        "wood": 1635,
        "clay": 880,
        "iron": 1385,
        "crop": 1130,
        "pop": 14,
        "cp": 6,
        "effects": {
          "trainingTimeStable": 0.96,
          "reduceSupply": null
        }
      },
      {
        "level": 5,
        "time": 7023,
        "wood": 2095,
        "clay": 1125,
        "iron": 1770,
        "crop": 1450,
        "pop": 17,
        "cp": 7,
        "effects": {
          "trainingTimeStable": 0.95,
          "reduceSupply": null
        }
      },
      {
        "level": 6,
        "time": 8747,
        "wood": 2680,
        "clay": 1445,
        "iron": 2270,
        "crop": 1855,
        "pop": 20,
        "cp": 9,
        "effects": {
          "trainingTimeStable": 0.94,
          "reduceSupply": null
        }
      },
      {
        "level": 7,
        "time": 10747,
        "wood": 3430,
        "clay": 1845,
        "iron": 2905,
        "crop": 2375,
        "pop": 23,
        "cp": 11,
        "effects": {
          "trainingTimeStable": 0.9299999999999999,
          "reduceSupply": null
        }
      },
      {
        "level": 8,
        "time": 13066,
        "wood": 4390,
        "clay": 2365,
        "iron": 3715,
        "crop": 3040,
        "pop": 26,
        "cp": 13,
        "effects": {
          "trainingTimeStable": 0.92,
          "reduceSupply": null
        }
      },
      {
        "level": 9,
        "time": 15757,
        "wood": 5620,
        "clay": 3025,
        "iron": 4755,
        "crop": 3890,
        "pop": 29,
        "cp": 15,
        "effects": {
          "trainingTimeStable": 0.91,
          "reduceSupply": null
        }
      },
      {
        "level": 10,
        "time": 18878,
        "wood": 7195,
        "clay": 3875,
        "iron": 6085,
        "crop": 4980,
        "pop": 32,
        "cp": 19,
        "effects": {
          "trainingTimeStable": 0.9,
          "reduceSupply": 4
        }
      },
      {
        "level": 11,
        "time": 22498,
        "wood": 9210,
        "clay": 4960,
        "iron": 7790,
        "crop": 6375,
        "pop": 36,
        "cp": 22,
        "effects": {
          "trainingTimeStable": 0.89,
          "reduceSupply": null
        }
      },
      {
        "level": 12,
        "time": 26698,
        "wood": 11785,
        "clay": 6345,
        "iron": 9975,
        "crop": 8160,
        "pop": 40,
        "cp": 27,
        "effects": {
          "trainingTimeStable": 0.88,
          "reduceSupply": null
        }
      },
      {
        "level": 13,
        "time": 31569,
        "wood": 15085,
        "clay": 8125,
        "iron": 12765,
        "crop": 10445,
        "pop": 44,
        "cp": 32,
        "effects": {
          "trainingTimeStable": 0.87,
          "reduceSupply": null
        }
      },
      {
        "level": 14,
        "time": 37220,
        "wood": 19310,
        "clay": 10400,
        "iron": 16340,
        "crop": 13370,
        "pop": 48,
        "cp": 39,
        "effects": {
          "trainingTimeStable": 0.86,
          "reduceSupply": null
        }
      },
      {
        "level": 15,
        "time": 43776,
        "wood": 24720,
        "clay": 13310,
        "iron": 20915,
        "crop": 17115,
        "pop": 52,
        "cp": 46,
        "effects": {
          "trainingTimeStable": 0.85,
          "reduceSupply": 5
        }
      },
      {
        "level": 16,
        "time": 51380,
        "wood": 31640,
        "clay": 17035,
        "iron": 26775,
        "crop": 21905,
        "pop": 56,
        "cp": 55,
        "effects": {
          "trainingTimeStable": 0.84,
          "reduceSupply": null
        }
      },
      {
        "level": 17,
        "time": 60201,
        "wood": 40500,
        "clay": 21810,
        "iron": 34270,
        "crop": 28040,
        "pop": 60,
        "cp": 67,
        "effects": {
          "trainingTimeStable": 0.83,
          "reduceSupply": null
        }
      },
      {
        "level": 18,
        "time": 70433,
        "wood": 51840,
        "clay": 27915,
        "iron": 43865,
        "crop": 35890,
        "pop": 64,
        "cp": 80,
        "effects": {
          "trainingTimeStable": 0.8200000000000001,
          "reduceSupply": null
        }
      },
      {
        "level": 19,
        "time": 82302,
        "wood": 66355,
        "clay": 35730,
        "iron": 56145,
        "crop": 45940,
        "pop": 68,
        "cp": 96,
        "effects": {
          "trainingTimeStable": 0.81,
          "reduceSupply": null
        }
      },
      {
        "level": 20,
        "time": 96070,
        "wood": 84935,
        "clay": 45735,
        "iron": 71870,
        "crop": 58800,
        "pop": 72,
        "cp": 115,
        "effects": {
          "trainingTimeStable": 0.8,
          "reduceSupply": 6
        }
      }
    ]
  },
  {
    "gid": 46,
    "slug": "herbalist",
    "name": "Herbalist",
    "category": "Military",
    "maxLevel": 20,
    "cultureBase": 4,
    "effects": [
      "healTime",
      "woundedCapacity",
      "woundedCapacityPlus"
    ],
    "prerequisites": [
      {
        "type": "Building",
        "gid": [
          15
        ],
        "level": 10
      },
      {
        "type": "Building",
        "gid": [
          22
        ],
        "level": 15
      }
    ],
    "levels": [
      {
        "level": 1,
        "time": 3000,
        "wood": 900,
        "clay": 800,
        "iron": 750,
        "crop": 650,
        "pop": 3,
        "cp": 5,
        "effects": {
          "healTime": 0.5,
          "woundedCapacity": 188
        }
      },
      {
        "level": 2,
        "time": 3780,
        "wood": 1150,
        "clay": 1025,
        "iron": 960,
        "crop": 830,
        "pop": 5,
        "cp": 6,
        "effects": {
          "healTime": 0.45,
          "woundedCapacity": 234
        }
      },
      {
        "level": 3,
        "time": 4685,
        "wood": 1475,
        "clay": 1310,
        "iron": 1230,
        "crop": 1065,
        "pop": 7,
        "cp": 7,
        "effects": {
          "healTime": 0.405,
          "woundedCapacity": 281
        }
      },
      {
        "level": 4,
        "time": 5734,
        "wood": 1885,
        "clay": 1680,
        "iron": 1575,
        "crop": 1365,
        "pop": 9,
        "cp": 8,
        "effects": {
          "healTime": 0.3645,
          "woundedCapacity": 356
        }
      },
      {
        "level": 5,
        "time": 6952,
        "wood": 2415,
        "clay": 2145,
        "iron": 2015,
        "crop": 1745,
        "pop": 11,
        "cp": 10,
        "effects": {
          "healTime": 0.3281,
          "woundedCapacity": 431
        }
      },
      {
        "level": 6,
        "time": 8364,
        "wood": 3090,
        "clay": 2750,
        "iron": 2575,
        "crop": 2235,
        "pop": 13,
        "cp": 12,
        "effects": {
          "healTime": 0.2952,
          "woundedCapacity": 525
        }
      },
      {
        "level": 7,
        "time": 10002,
        "wood": 3960,
        "clay": 3520,
        "iron": 3300,
        "crop": 2860,
        "pop": 15,
        "cp": 14,
        "effects": {
          "healTime": 0.2657,
          "woundedCapacity": 656
        }
      },
      {
        "level": 8,
        "time": 11903,
        "wood": 5065,
        "clay": 4505,
        "iron": 4220,
        "crop": 3660,
        "pop": 17,
        "cp": 17,
        "effects": {
          "healTime": 0.2391,
          "woundedCapacity": 806
        }
      },
      {
        "level": 9,
        "time": 14107,
        "wood": 6485,
        "clay": 5765,
        "iron": 5405,
        "crop": 4685,
        "pop": 19,
        "cp": 21,
        "effects": {
          "healTime": 0.2152,
          "woundedCapacity": 975
        }
      },
      {
        "level": 10,
        "time": 16664,
        "wood": 8300,
        "clay": 7380,
        "iron": 6920,
        "crop": 5995,
        "pop": 21,
        "cp": 25,
        "effects": {
          "healTime": 0.1937,
          "woundedCapacity": 1200
        }
      },
      {
        "level": 11,
        "time": 19631,
        "wood": 10625,
        "clay": 9445,
        "iron": 8855,
        "crop": 7675,
        "pop": 24,
        "cp": 30,
        "effects": {
          "healTime": 0.1743,
          "woundedCapacity": 1481
        }
      },
      {
        "level": 12,
        "time": 23072,
        "wood": 13600,
        "clay": 12090,
        "iron": 11335,
        "crop": 9825,
        "pop": 27,
        "cp": 36,
        "effects": {
          "healTime": 0.1569,
          "woundedCapacity": 1875
        }
      },
      {
        "level": 13,
        "time": 27063,
        "wood": 17410,
        "clay": 15475,
        "iron": 14505,
        "crop": 12575,
        "pop": 30,
        "cp": 43,
        "effects": {
          "healTime": 0.1412,
          "woundedCapacity": 2250
        }
      },
      {
        "level": 14,
        "time": 31693,
        "wood": 22285,
        "clay": 19805,
        "iron": 18570,
        "crop": 16095,
        "pop": 33,
        "cp": 51,
        "effects": {
          "healTime": 0.1271,
          "woundedCapacity": 2813
        }
      },
      {
        "level": 15,
        "time": 37064,
        "wood": 28520,
        "clay": 25355,
        "iron": 23770,
        "crop": 20600,
        "pop": 36,
        "cp": 62,
        "effects": {
          "healTime": 0.1144,
          "woundedCapacity": 3375
        }
      },
      {
        "level": 16,
        "time": 43294,
        "wood": 36510,
        "clay": 32450,
        "iron": 30425,
        "crop": 26365,
        "pop": 39,
        "cp": 74,
        "effects": {
          "healTime": 0.1029,
          "woundedCapacity": 4125
        }
      },
      {
        "level": 17,
        "time": 50522,
        "wood": 46730,
        "clay": 41540,
        "iron": 38940,
        "crop": 33750,
        "pop": 42,
        "cp": 89,
        "effects": {
          "healTime": 0.0927,
          "woundedCapacity": 5063
        }
      },
      {
        "level": 18,
        "time": 58905,
        "wood": 59815,
        "clay": 53170,
        "iron": 49845,
        "crop": 43200,
        "pop": 45,
        "cp": 106,
        "effects": {
          "healTime": 0.0834,
          "woundedCapacity": 6375
        }
      },
      {
        "level": 19,
        "time": 68630,
        "wood": 76565,
        "clay": 68055,
        "iron": 63805,
        "crop": 55295,
        "pop": 48,
        "cp": 128,
        "effects": {
          "healTime": 0.075,
          "woundedCapacity": 7875
        }
      },
      {
        "level": 20,
        "time": 79911,
        "wood": 98000,
        "clay": 87110,
        "iron": 81670,
        "crop": 70780,
        "pop": 51,
        "cp": 153,
        "effects": {
          "healTime": 0.0675,
          "woundedCapacity": 9563
        }
      }
    ]
  }
];

export const BUILDINGS_BY_GID = new Map<number, CatalogBuilding>(
  BUILDINGS.map((b) => [b.gid, b])
);
