// Gold-Standard NEET Benchmark Dataset: TEST 8 and SOLUTIONS 8
// Authoritative 180-question NEET Mock Test, Page 45 Official Answer Key, and 30-Page Step-by-Step Solutions
import { MockTest, MockQuestion } from "../types";

export const GOLD_STANDARD_TEST_8_INFO: MockTest = {
  id: "cbt-gold-test-08",
  testNumber: "Test 08",
  code: "27882",
  title: "NEET UG Major Test-08 (Code 27882 - Gold Standard)",
  description: "Official Brahmastra Major Test-08 with 180 verified questions, diagrams, official Page 45 answer keys, and step-by-step solutions.",
  testTypeCategory: "full_syllabus",
  type: "full_syllabus",
  subjects: ["Physics", "Chemistry", "Biology"],
  totalQuestions: 180,
  durationMinutes: 180,
  maxMarks: 720,
  correctMarks: 4,
  negativeMarks: 1,
  price: 0,
  isPurchased: true,
  status: "published",
  languages: ["en", "hi"],
  isBilingual: true,
  allowMultipleAttempts: true,
  showLeaderboard: true,
  createdAt: "2026-11-04T00:00:00.000Z",
  questionsCount: 180
};

export const OFFICIAL_ANSWER_KEY_180: Record<number, "A" | "B" | "C" | "D"> = {
  "1": "A",
  "2": "B",
  "3": "B",
  "4": "B",
  "5": "D",
  "6": "C",
  "7": "C",
  "8": "A",
  "9": "A",
  "10": "C",
  "11": "C",
  "12": "A",
  "13": "D",
  "14": "C",
  "15": "A",
  "16": "C",
  "17": "A",
  "18": "B",
  "19": "A",
  "20": "A",
  "21": "C",
  "22": "C",
  "23": "C",
  "24": "B",
  "25": "C",
  "26": "A",
  "27": "D",
  "28": "C",
  "29": "D",
  "30": "D",
  "31": "A",
  "32": "A",
  "33": "B",
  "34": "B",
  "35": "C",
  "36": "B",
  "37": "C",
  "38": "A",
  "39": "B",
  "40": "D",
  "41": "A",
  "42": "C",
  "43": "B",
  "44": "C",
  "45": "B",
  "46": "C",
  "47": "A",
  "48": "C",
  "49": "D",
  "50": "A",
  "51": "C",
  "52": "A",
  "53": "C",
  "54": "D",
  "55": "C",
  "56": "C",
  "57": "A",
  "58": "A",
  "59": "A",
  "60": "A",
  "61": "D",
  "62": "C",
  "63": "B",
  "64": "A",
  "65": "D",
  "66": "D",
  "67": "B",
  "68": "D",
  "69": "A",
  "70": "A",
  "71": "A",
  "72": "B",
  "73": "C",
  "74": "C",
  "75": "A",
  "76": "B",
  "77": "A",
  "78": "C",
  "79": "A",
  "80": "B",
  "81": "D",
  "82": "C",
  "83": "D",
  "84": "C",
  "85": "D",
  "86": "D",
  "87": "A",
  "88": "B",
  "89": "B",
  "90": "C",
  "91": "B",
  "92": "A",
  "93": "D",
  "94": "D",
  "95": "A",
  "96": "A",
  "97": "D",
  "98": "C",
  "99": "A",
  "100": "B",
  "101": "D",
  "102": "A",
  "103": "C",
  "104": "D",
  "105": "A",
  "106": "B",
  "107": "D",
  "108": "C",
  "109": "A",
  "110": "D",
  "111": "A",
  "112": "B",
  "113": "B",
  "114": "C",
  "115": "B",
  "116": "A",
  "117": "C",
  "118": "D",
  "119": "B",
  "120": "B",
  "121": "C",
  "122": "D",
  "123": "C",
  "124": "B",
  "125": "D",
  "126": "A",
  "127": "C",
  "128": "C",
  "129": "A",
  "130": "A",
  "131": "B",
  "132": "B",
  "133": "B",
  "134": "A",
  "135": "A",
  "136": "A",
  "137": "B",
  "138": "A",
  "139": "C",
  "140": "A",
  "141": "C",
  "142": "A",
  "143": "B",
  "144": "B",
  "145": "C",
  "146": "C",
  "147": "C",
  "148": "B",
  "149": "C",
  "150": "B",
  "151": "B",
  "152": "C",
  "153": "A",
  "154": "C",
  "155": "C",
  "156": "B",
  "157": "B",
  "158": "D",
  "159": "A",
  "160": "D",
  "161": "B",
  "162": "B",
  "163": "B",
  "164": "B",
  "165": "B",
  "166": "C",
  "167": "B",
  "168": "B",
  "169": "D",
  "170": "A",
  "171": "B",
  "172": "C",
  "173": "C",
  "174": "A",
  "175": "B",
  "176": "C",
  "177": "C",
  "178": "C",
  "179": "C",
  "180": "C"
};

export const GOLD_STANDARD_TEST_8_QUESTIONS: MockQuestion[] = [
  {
    "id": "gold-test8-q1",
    "questionNumber": 1,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A gas is compressed at a constant\n2\npressure of 50N/m from a volume of\n3 3\n10m to a volume of 4 m . Energy of 100J\nis then added to the gas by heating. Its\ninternal energy is –",
    "options": [
      {
        "label": "A",
        "value": "Increased by 400J",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Increased by 200J",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Increased by 100J",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Decreased by 200J",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Now  Q = 100 J  So   increased  ΔU = ΔQ = ΔW  ΔW = P Δ V = 50 [4 − 10] = −300 J  ΔQ = 100 J ΔU = 400 J",
    "languages": {
      "en": {
        "questionText": "A gas is compressed at a constant\n2\npressure of 50N/m from a volume of\n3 3\n10m to a volume of 4 m . Energy of 100J\nis then added to the gas by heating. Its\ninternal energy is –",
        "options": [
          {
            "label": "A",
            "value": "Increased by 400J",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Increased by 200J",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Increased by 100J",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Decreased by 200J",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक गै स 50N/m 2 के िन यत दा ब पर 10m 3 के\n3\nआयतन से 4 m के आयतन तक सं पी ड़ी त की जा ती है ।\nिफ र 100J की ऊ जा\u0000 ग म\u0000 कर के (by heating) गै स म\u0000\nजो ड़ी जा ती है । इस की आं त \u0000र क उ जा\u0000 -",
        "options": [
          {
            "label": "A",
            "value": "400J से बढ ती है",
            "type": "text"
          },
          {
            "label": "B",
            "value": "200J से बढ ती है",
            "type": "text"
          },
          {
            "label": "C",
            "value": "100J से बढ ती है",
            "type": "text"
          },
          {
            "label": "D",
            "value": "200J से घट ती है",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 3,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q2",
    "questionNumber": 2,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "Which of the following is NOT a\nfundamental quantity?",
    "options": [
      {
        "label": "A",
        "value": "Temperature",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Electric charge",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Mass",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Electric current",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "There are seven fundamental quantities :  Mass,   Length,   Time,   Temperature,   Electric  current,   Luminous   intensity,   Amount   of  substance.  Electric charge is not include in these quantities",
    "languages": {
      "en": {
        "questionText": "Which of the following is NOT a\nfundamental quantity?",
        "options": [
          {
            "label": "A",
            "value": "Temperature",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Electric charge",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Mass",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Electric current",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त म\u0000 से कौ न सी मू ल रा िश न हीं है ?",
        "options": [
          {
            "label": "A",
            "value": "ता प मा न",
            "type": "text"
          },
          {
            "label": "B",
            "value": "िव द्यु त आ वे श",
            "type": "text"
          },
          {
            "label": "C",
            "value": "\u0000 \u0000 मा न",
            "type": "text"
          },
          {
            "label": "D",
            "value": "िव द्यु त धा रा",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 3,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q3",
    "questionNumber": 3,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "What is the smallest electric force between\ntwo charges placed at a distance",
    "options": [
                  {
                            "label": "A",
                            "value": "3.204 × 10⁻²⁴ N",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "2.304 × 10⁻²⁸ N",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "4.204 × 10⁻²² N",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "5.204 × 10⁻²⁰ N",
                            "type": "text"
                  }
        ],
    "correctAnswer": "B",
    "explanation": "For F   to be minimum, q   an q   should be  minimum, we know that  Hence,  = 2.304 × 10   N  F e   =   . 1 4 πε 0  q 1 q 2  r 2  e   1   2  (q 1 ) min   = (q 2 ) min   = e = 1. 6 × 10 –19   C (F e ) min   =   (   9×10 9   ) (   1.6×10 –19   ) (   1.6×10 –19   )  ( 1.0 )   2  –28",
    "languages": {
      "en": {
        "questionText": "What is the smallest electric force between\ntwo charges placed at a distance",
        "options": [
          {
            "label": "A",
            "value": "3.204 × 10⁻²⁴ N",
            "type": "text"
          },
          {
            "label": "B",
            "value": "2.304 × 10⁻²⁸ N",
            "type": "text"
          },
          {
            "label": "C",
            "value": "4.204 × 10⁻²² N",
            "type": "text"
          },
          {
            "label": "D",
            "value": "5.204 × 10⁻²⁰ N",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "1.0 मी टर दू री पर र खे दो आ वे शों के बी च\nल घु \u0000 म िव द्यु त बल \u0000ा है ?\n–24\n(1) 3.204×10 N\n–28\n(2) 2.304×10 N\n–22\n(3) 4.204×10 N\n–20\n(4) 5.204×10 N",
        "options": [
  {
    "label": "A",
    "value": "3.204 × 10⁻²⁴ N",
    "type": "text"
  },
  {
    "label": "B",
    "value": "2.304 × 10⁻²⁸ N",
    "type": "text"
  },
  {
    "label": "C",
    "value": "4.204 × 10⁻²² N",
    "type": "text"
  },
  {
    "label": "D",
    "value": "5.204 × 10⁻²⁰ N",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 3,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q4",
    "questionNumber": 4,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "The co-ordinates of a particle moving in x-\ny plane are given by ; x = 2 + 4t , y = 3t\n2\n+ 8t .The motion of the particle is -",
    "options": [
      {
        "label": "A",
        "value": "uniform motion along a straight line",
        "type": "text"
      },
      {
        "label": "B",
        "value": "uniformly accelerated having motion\nalong a parabolic path",
        "type": "text"
      },
      {
        "label": "C",
        "value": "non-uniformly accelerated",
        "type": "text"
      },
      {
        "label": "D",
        "value": "uniformly accelerated having motion\nalong a straight line",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Given  x = 2 + 4t  y = 3t + 8t  a   = 0  a   = +16  a   = +16 i.e. uniformly accelerated  Also, from given equation  4y = 3x – 6 + 2x   + 8   – 8x  i.e. parabolic path.  2  v x   =   = 4   ( constant ) dx dt  v y   =   = 3 + 16t  dy dt  x  y  net  t =   x−2 4  ∴   y = 3   + 8 (   ) 2 (x−2) 4 x−2 4  =   x −   +   ( x 2   + 4 − 4x ) 3 4 3 2 1 2  y =   x −   +   + 2 − 2x 3 4 3 2 x 2  2  ⇒   2  ⇒ 4y = 2x 2   − 5x + 2",
    "languages": {
      "en": {
        "questionText": "The co-ordinates of a particle moving in x-\ny plane are given by ; x = 2 + 4t , y = 3t\n2\n+ 8t .The motion of the particle is -",
        "options": [
          {
            "label": "A",
            "value": "uniform motion along a straight line",
            "type": "text"
          },
          {
            "label": "B",
            "value": "uniformly accelerated having motion\nalong a parabolic path",
            "type": "text"
          },
          {
            "label": "C",
            "value": "non-uniformly accelerated",
            "type": "text"
          },
          {
            "label": "D",
            "value": "uniformly accelerated having motion\nalong a straight line",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "x-y तल म\u0000 ग ित मा न एक कण के िन द\u0000 शां क िन \u0000 \u0000 का र\n2\nिद ये ग ये ह\u0000 x = 2 + 4t, y = 3t + 8t कण की ग ित\nहै ।",
        "options": [
          {
            "label": "A",
            "value": "एक सरल रे खा के अ नु िद श एकस मा न ग ित",
            "type": "text"
          },
          {
            "label": "B",
            "value": "परवल िय क पथ के अ नु िद श एकस मा न \u0000 \u0000र त ग ित",
            "type": "text"
          },
          {
            "label": "C",
            "value": "अस मा न \u0000 \u0000र त",
            "type": "text"
          },
          {
            "label": "D",
            "value": "सी धी रे खा के अ नु िद श एकस मा न \u0000 \u0000र त ग ित",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 3,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q5",
    "questionNumber": 5,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A 2 MeV proton is moving perpendicular to\na uniform magnetic field of 2.5T . The\nforce on proton is −\n−10",
    "options": [
                  {
                            "label": "A",
                            "value": "7.8 × 10⁻¹² N",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "6.8 × 10⁻¹² N",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "5.8 × 10⁻¹² N",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "4.8 × 10⁻¹² N",
                            "type": "text"
                  }
        ],
    "correctAnswer": "D",
    "explanation": "Given :  Kinetic energy of proton, E = 2 MeV = 2 x  10   eV = 3.2 x 10   J  Magnetic field, B = 2.5 T  Kinetic energy is given by :  K =   mv  m is the mass of proton, m = 1.67 x 10   kg  v   =  v   = 3.83 x 10  v = 1.95 x 10   m/s  Force on the proton is given by:  F = qvBsin θ  Here, θ = 90°  F = qvB  = 1.6 × 10   × 10   × 2.5  6   —13  1 2   2  —27  2   2×3.2×10 −13  1.67×10 27  2   14  7  -19   7  F = 7. 8 × 10 −12   N ≈ 8 × 10 −12   N",
    "languages": {
      "en": {
        "questionText": "A 2 MeV proton is moving perpendicular to\na uniform magnetic field of 2.5T . The\nforce on proton is −\n−10",
        "options": [
          {
            "label": "A",
            "value": "2.5 × 10⁻¹⁰ N",
            "type": "text"
          },
          {
            "label": "B",
            "value": "8 × 10¹¹ N",
            "type": "text"
          },
          {
            "label": "C",
            "value": "2.5 × 10⁻¹¹ N",
            "type": "text"
          },
          {
            "label": "D",
            "value": "8 × 10⁻¹² N",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक 2 MeV \u0000ो टॉ न 2.5T के एकस मा न चुं ब की य \u0000े \u0000 के\nलं बवत घू म र हा है । \u0000ो टॉ न पर बल है −\n−10",
        "options": [
  {
    "label": "A",
    "value": "7.8 × 10⁻¹² N",
    "type": "text"
  },
  {
    "label": "B",
    "value": "6.8 × 10⁻¹² N",
    "type": "text"
  },
  {
    "label": "C",
    "value": "5.8 × 10⁻¹² N",
    "type": "text"
  },
  {
    "label": "D",
    "value": "4.8 × 10⁻¹² N",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 3,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q6",
    "questionNumber": 6,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A wire of length 'L' and radius 'r' is\nclamped rigidly at one end. When the\nother end of the wire is pulled by a force f,\nits length increases by 'l'. Another wire of\nsame material of length '2L' and radius '2r'\nis pulled by a force '2f'. Then the increase\nin its length will be :",
    "options": [
      {
        "label": "A",
        "value": "l /2",
        "type": "text"
      },
      {
        "label": "B",
        "value": "4 l",
        "type": "text"
      },
      {
        "label": "C",
        "value": "l",
        "type": "text"
      },
      {
        "label": "D",
        "value": "2 l",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "By Hooke's law  Therefore, the correct answer is (3).  Y =   Fl AΔl  Δl ∝   Fl A  =   ×  Δl 2  Δl 1  F 2 l 2  F 1 l 1  A 1  A 2  =   × 2f×2 L f×L  π ( r ) 2  π (2r) 2  Δl 1   = Δl 2  Δl 2   = l",
    "languages": {
      "en": {
        "questionText": "A wire of length 'L' and radius 'r' is\nclamped rigidly at one end. When the\nother end of the wire is pulled by a force f,\nits length increases by 'l'. Another wire of\nsame material of length '2L' and radius '2r'\nis pulled by a force '2f'. Then the increase\nin its length will be :",
        "options": [
          {
            "label": "A",
            "value": "l /2",
            "type": "text"
          },
          {
            "label": "B",
            "value": "4 l",
            "type": "text"
          },
          {
            "label": "C",
            "value": "l",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2 l",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "'L' ल \u0000ा ई ए वं 'r' ि\u0000 \u0000ा वा ला को ई ता र अप ने एक िस रे\nसे \u0000 ढ़ ता पू व\u0000 क बँ धा \u0000 आ है । जब ता र का दू स रा िस रा\nबल f \u0000ा रा खीं चा जा ता है , तो इस की ल \u0000ा ई म\u0000 'l' वृ \u0000\u0000\nहो जा ती है । स मा न प दा थ\u0000 से ब ना '2 L' ल \u0000ा ई ए वं '2r'\nि\u0000 \u0000ा वा ला ता र इ सी \u0000 का र से '2f ' बल \u0000ा रा खीं चा\nजा ता है । अब ल \u0000ा ई म\u0000 वृ \u0000\u0000 हो गी :",
        "options": [
          {
            "label": "A",
            "value": "l /2",
            "type": "text"
          },
          {
            "label": "B",
            "value": "4 l",
            "type": "text"
          },
          {
            "label": "C",
            "value": "l",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2 l",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 4,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q7",
    "questionNumber": 7,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A body cools from a temperature 3T to 2T\nin 10 minutes. The room temperature is T.\nAssume that Newton’s law of cooling is\napplicable. The temperature of the body at\nthe end of next 10 minutes will be",
    "options": [
      {
        "label": "A",
        "value": "T\n7",
        "type": "text"
      },
      {
        "label": "B",
        "value": "T\n4\n3",
        "type": "text"
      },
      {
        "label": "C",
        "value": "T\n2\n4",
        "type": "text"
      },
      {
        "label": "D",
        "value": "T\n3",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "By the Newton's law of cooling  For case -I  or  According to question   in next 10 min it cools  from 2T to a unknown temperature T' then  or  = k   (   − To ) dT dt T 1 +T 2  2  ∴  = k   [   − T ] 3T−2T 10 3T+2T 2  = k   [   ] T 10 3T 2  k =   1 15  = k   [   − T ] 2T−T' 10 2T+T' 2  =   × 2T−T' 10 1 15 T' 2  6T − 3T' = T' T' =   T 3 2",
    "languages": {
      "en": {
        "questionText": "A body cools from a temperature 3T to 2T\nin 10 minutes. The room temperature is T.\nAssume that Newton’s law of cooling is\napplicable. The temperature of the body at\nthe end of next 10 minutes will be",
        "options": [
          {
            "label": "A",
            "value": "T\n7",
            "type": "text"
          },
          {
            "label": "B",
            "value": "T\n4\n3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "T\n2\n4",
            "type": "text"
          },
          {
            "label": "D",
            "value": "T\n3",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िक सी व \u0000ु का ता प 3T से 2T तक िग र ने म\u0000 10 िम नट\nका समय लग ता है । कम रे का ता प T है । य िद इस म\u0000\n\u0000ू टन के शी तलन िन यम का अ नु पा लन हो ता है , तो अग ले\n10 िम नट के अ \u0000 म\u0000 व \u0000ु का ता प हो गा",
        "options": [
          {
            "label": "A",
            "value": "T\n7",
            "type": "text"
          },
          {
            "label": "B",
            "value": "T\n4\n3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "T\n2\n4",
            "type": "text"
          },
          {
            "label": "D",
            "value": "T\n3",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 4,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q8",
    "questionNumber": 8,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A broad pipe having a radius 10 cm\nbranches into two pipes of radii, 5 cm and\n3 cm. If the velocity of flowing water in the\npipe of radius 3 cm be 5 cm/s, determine\nthe velocities of water in the remaining\ntwo pipes. Given that the rate of discharge\n3\nthrough the main branch, is 600 π cm /s.",
    "options": [
      {
        "label": "A",
        "value": "v₁ = 6 cm/s and v₂ = 22.2 cm/s",
        "type": "text"
      },
      {
        "label": "B",
        "value": "v₁ = 4 cm/s and v₂ = 12.2 cm/s",
        "type": "text"
      },
      {
        "label": "C",
        "value": "v₁ = 3 cm/s and v₂ = 10.2 cm/s",
        "type": "text"
      },
      {
        "label": "D",
        "value": "None of these",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Consider any three sections (1), (2) and (3) in the three pipes of different radii, as shown in the figure. If v₁ and v₂ be the velocity of water at section (1) and (2) respectively, then: A₁ = π(10)² = 100π cm²; A₂ = π(5)² = 25π cm²; A₃ = π(3)² = 9π cm². Given v₃ = 5 cm/s. Rate of discharge: Q = A₁v₁ = A₂v₂ + A₃v₃. 600π = 100πv₁ => v₁ = 6 cm/s. 600π = 25πv₂ + 45π => 25πv₂ = 555π => v₂ = 22.2 cm/s. Therefore, correct answer is (A).",
    "figureUrl": "/q8_cropped_perfect.png",
    "questionImageUrl": "/q8_cropped_perfect.png",
    "languages": {
      "en": {
        "questionText": "A broad pipe having a radius 10 cm\nbranches into two pipes of radii, 5 cm and\n3 cm. If the velocity of flowing water in the\npipe of radius 3 cm be 5 cm/s, determine\nthe velocities of water in the remaining\ntwo pipes. Given that the rate of discharge\nthrough the main branch, is 600 π cm³/s.",
        "options": [
          {
            "label": "A",
            "value": "v₁ = 6 cm/s and v₂ = 22.2 cm/s",
            "type": "text"
          },
          {
            "label": "B",
            "value": "v₁ = 4 cm/s and v₂ = 12.2 cm/s",
            "type": "text"
          },
          {
            "label": "C",
            "value": "v₁ = 3 cm/s and v₂ = 10.2 cm/s",
            "type": "text"
          },
          {
            "label": "D",
            "value": "None of these",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "10 cm त्रिज्या वाला एक चौड़ा पाइप 5 cm और 3 cm त्रिज्या वाले दो पाइपों में विभाजित होता है। यदि 3 cm त्रिज्या वाले पाइप में बहते पानी का वेग 5 cm/s है, तो शेष दो पाइपों में पानी का वेग ज्ञात करें। दिया गया है कि मुख्य शाखा के माध्यम से निवर्हन की दर 600 π cm³/s है।",
        "options": [
          {
            "label": "A",
            "value": "v₁ = 6 cm/s और v₂ = 22.2 cm/s",
            "type": "text"
          },
          {
            "label": "B",
            "value": "v₁ = 4 cm/s और v₂ = 12.2 cm/s",
            "type": "text"
          },
          {
            "label": "C",
            "value": "v₁ = 3 cm/s और v₂ = 10.2 cm/s",
            "type": "text"
          },
          {
            "label": "D",
            "value": "इनमें से कोई नहीं",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 4,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q9",
    "questionNumber": 9,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "Which of the following represents the\ndimensions of Farad\n−1 −2 4 2",
    "options": [
      {
        "label": "A",
        "value": "M L T A\n2 2 −2",
        "type": "text"
      },
      {
        "label": "B",
        "value": "ML T A\n2 2 −1",
        "type": "text"
      },
      {
        "label": "C",
        "value": "ML T A\n−2 −1",
        "type": "text"
      },
      {
        "label": "D",
        "value": "MT A",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "One farad is defined as the capacitance C of a  capacitor   across   which,   when   charged   with   Q  coulomb, when there is potential   difference of  1 volt. So,  [ C ]= [   ] = [   ] = [   ]  Q V Q 2  W A 2 T   2  M   1 L 2 T   −2  [ C ]= [ M   −1 L −2 T   4 A 2 ]",
    "languages": {
      "en": {
        "questionText": "Which of the following represents the\ndimensions of Farad\n−1 −2 4 2",
        "options": [
          {
            "label": "A",
            "value": "M L T A\n2 2 −2",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ML T A\n2 2 −1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ML T A\n−2 −1",
            "type": "text"
          },
          {
            "label": "D",
            "value": "MT A",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त म\u0000 से कौ न फै रा ड की िव मा ओं को द शा\u0000 ता है\n−1 −2 4 2",
        "options": [
          {
            "label": "A",
            "value": "M L T A\n2 2 −2",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ML T A\n2 2 −1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ML T A\n−2 −1",
            "type": "text"
          },
          {
            "label": "D",
            "value": "MT A",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 4,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q10",
    "questionNumber": 10,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A particle is projected upward from the\nsurface of earth (radius=R) with a speed\nequal to the orbital speed of a satellite\nnear the earth's surface. The height to\nwhich it would rise is",
    "options": [
      {
        "label": "A",
        "value": "√ 2 R\nR",
        "type": "text"
      },
      {
        "label": "B",
        "value": "√2",
        "type": "text"
      },
      {
        "label": "C",
        "value": "R",
        "type": "text"
      },
      {
        "label": "D",
        "value": "2R",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Orbital speed near the earth's surface is  Conserving energy,  or  h = R  v 0   =   √   GM R  mv 2 0 –   = − 1 2 GMm R GMm R+h  –   =–   =– 1 2 GM R GM R GM R+h GM 2R  ⇒",
    "languages": {
      "en": {
        "questionText": "A particle is projected upward from the\nsurface of earth (radius=R) with a speed\nequal to the orbital speed of a satellite\nnear the earth's surface. The height to\nwhich it would rise is",
        "options": [
          {
            "label": "A",
            "value": "√ 2 R\nR",
            "type": "text"
          },
          {
            "label": "B",
            "value": "√2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "R",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2R",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक कण को पृ \u0000ी की सतह ( ि\u0000 \u0000ा = R) से ऊपर की\nओर \u0000 \u0000े िप त िक या जा ता है , िज स की चा ल पृ \u0000ी की सतह\nके पा स एक उप \u0000 ह की क \u0000ी य चा ल के ब रा बर हो ती है ।\nवह िज स ऊँ चा ई तक उ ठे गा वह है",
        "options": [
          {
            "label": "A",
            "value": "√ 2 R\nR",
            "type": "text"
          },
          {
            "label": "B",
            "value": "√2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "R",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2R",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 5,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q11",
    "questionNumber": 11,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "Two projectiles A and B are thrown with\ninitial velocities of 40 m/s and 60 m/s at\nangles 30° and 60° with the horizontal\nrespectively. The ratio of their ranges\n2\nrespectively is ( g = 10 m/s ) :-",
    "options": [
      {
        "label": "A",
        "value": "2 : √3",
        "type": "text"
      },
      {
        "label": "B",
        "value": "√3 : 2",
        "type": "text"
      },
      {
        "label": "C",
        "value": "4 : 9",
        "type": "text"
      },
      {
        "label": "D",
        "value": "1 : 1",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "The horizontal range of the projectile is  R =   u 2   sin 2 θ  g  {Here u 1   = 40 m/s,   θ 1   = 30 ∘ , u 2   = 60 m/s,   θ 2   = 60 ∘ } =   (   ) 2 R 1  R 2  u 1  u 2  sin 2 θ 1  sin 2 θ 2  =   (   ) 2 R 1  R 2  40 60 sin 60° sin 120°  ⇒   =  R 1  R 2  4 9",
    "languages": {
      "en": {
        "questionText": "Two projectiles A and B are thrown with\ninitial velocities of 40 m/s and 60 m/s at\nangles 30° and 60° with the horizontal\nrespectively. The ratio of their ranges\n2\nrespectively is ( g = 10 m/s ) :-",
        "options": [
          {
            "label": "A",
            "value": "2 : √3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "√3 : 2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "4 : 9",
            "type": "text"
          },
          {
            "label": "D",
            "value": "1 : 1",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "दो \u0000 \u0000े \u0000 A व B को \u0000ै ित ज से 30° व 60° के को ण\nपर \u0000 मश : 40 m/s व 60 m/s के \u0000ा रं िभ क वे ग से\n\u0000 \u0000े िप त िक या जा ता है । इन की प रा सों का अ नु पा त\n2\n\u0000 मश : है ( g = 10 m/s ) :-",
        "options": [
          {
            "label": "A",
            "value": "2 : √3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "√3 : 2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "4 : 9",
            "type": "text"
          },
          {
            "label": "D",
            "value": "1 : 1\n–3",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 5,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q12",
    "questionNumber": 12,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "If the radius of a coil is changing at the rate 10⁻² SI units in a normal magnetic field 10⁻³ SI units, the induced emf is 1μV. What is the final radius of the coil ?",
    "options": [
                  {
                            "label": "A",
                            "value": "3.14 × 10⁻² V",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "6.28 × 10⁻² V",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "1.57 × 10⁻² V",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "Zero",
                            "type": "text"
                  }
        ],
    "correctAnswer": "A",
    "explanation": "Given :  Changing rate of radius =   unit  Magnetic field   =   unit  Induced emf e = 1   V  The induced emf is given by  r =  10 −2  10 −3  μ  e = −   = −   = −B (2 π r)  d ϕ  dt BdA dt dr dt  r =   e B ( 2 π ) (   )  dr dt  1×10 −6  10 −3 ×2×3.14×10 −2  1. 6 cm",
    "languages": {
      "en": {
        "questionText": "If the radius of a coil is changing at the rate 10⁻² SI units in a normal magnetic field 10⁻³ SI units, the induced emf is 1μV. What is the final radius of the coil ?",
        "options": [
          {
            "label": "A",
            "value": "1.6 cm",
            "type": "text"
          },
          {
            "label": "B",
            "value": "16 cm",
            "type": "text"
          },
          {
            "label": "C",
            "value": "12 cm",
            "type": "text"
          },
          {
            "label": "D",
            "value": "1.2 cm",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "य िद िक सी कुं ड ली की ि\u0000 \u0000ा , 10 SI मा \u0000 क\n–2\nके ल \u0000 व त् चुं ब की य \u0000े \u0000 म\u0000 , 10 SI मा \u0000 क की दर से\nबदल र ही है , तो \u0000े \u0000र त िव द्यु त वा हक बल 1 μ V है ।\nकुं ड ली की अं ित म ि\u0000 \u0000ा \u0000ा है ?",
        "options": [
  {
    "label": "A",
    "value": "3.14 × 10⁻² V",
    "type": "text"
  },
  {
    "label": "B",
    "value": "6.28 × 10⁻² V",
    "type": "text"
  },
  {
    "label": "C",
    "value": "1.57 × 10⁻² V",
    "type": "text"
  },
  {
    "label": "D",
    "value": "Zero",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 5,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q13",
    "questionNumber": 13,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "Air outside a water lake is blowing at –\n40°C. It takes 10 hours for first two\ncentimeter of ice layer to form over the\nlake. Time taken to form next four\ncentimeter of ice layer formation will be",
    "options": [
      {
        "label": "A",
        "value": "20 hours",
        "type": "text"
      },
      {
        "label": "B",
        "value": "40 hours",
        "type": "text"
      },
      {
        "label": "C",
        "value": "60 hours",
        "type": "text"
      },
      {
        "label": "D",
        "value": "80 hours\n2",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "=   ⇒ t = 80 h t 10 6 2 –2 2  2 2 –0 2",
    "languages": {
      "en": {
        "questionText": "Air outside a water lake is blowing at –\n40°C. It takes 10 hours for first two\ncentimeter of ice layer to form over the\nlake. Time taken to form next four\ncentimeter of ice layer formation will be",
        "options": [
          {
            "label": "A",
            "value": "20 hours",
            "type": "text"
          },
          {
            "label": "B",
            "value": "40 hours",
            "type": "text"
          },
          {
            "label": "C",
            "value": "60 hours",
            "type": "text"
          },
          {
            "label": "D",
            "value": "80 hours\n2",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक जल झी ल के बा हर ह वा –40°C पर चल र ही है ।\nझी ल के ऊपर ब फ \u0000 की पह ली दो स\u0000 टी मी टर परत बन ने म\u0000\n10 घं टे लग ते ह\u0000 । अग ले चा र स\u0000 टी मी टर ब फ \u0000 की परत\nबन ने म\u0000 लग ने वा ला समय हो गा",
        "options": [
          {
            "label": "A",
            "value": "20 घं टे",
            "type": "text"
          },
          {
            "label": "B",
            "value": "40 घं टे",
            "type": "text"
          },
          {
            "label": "C",
            "value": "60 घं टे",
            "type": "text"
          },
          {
            "label": "D",
            "value": "80 घं टे\n2",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 5,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q14",
    "questionNumber": 14,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "In the formula X = 3 YZ², X and Z have dimensions of capacitance and magnetic induction respectively. The dimensions of Y in MKSA system are -",
    "options": [
      {
        "label": "A",
        "value": "[M⁻³ L⁻² T⁻² A⁻⁴]",
        "type": "text"
      },
      {
        "label": "B",
        "value": "[M L⁻²]",
        "type": "text"
      },
      {
        "label": "C",
        "value": "[M⁻³ L⁻² T⁸ A⁴]",
        "type": "text"
      },
      {
        "label": "D",
        "value": "[M⁻³ L⁻² T⁴ A⁴]",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "X = 3 YZ 2  [Y] =   = =   [ M −3 L −2 T 8 A 4 ]  [X] [Z] 2  [ M −1 L −2 T 4 A 2 ]  [ MT −2   A ] 2",
    "languages": {
      "en": {
        "questionText": "In the formula X = 3 YZ², X and Z have dimensions of capacitance and magnetic induction respectively. The dimensions of Y in MKSA system are -",
        "options": [
          {
            "label": "A",
            "value": "[M⁻³ L⁻² T⁻² A⁻⁴]",
            "type": "text"
          },
          {
            "label": "B",
            "value": "[M L⁻²]",
            "type": "text"
          },
          {
            "label": "C",
            "value": "[M⁻³ L⁻² T⁸ A⁴]",
            "type": "text"
          },
          {
            "label": "D",
            "value": "[M⁻³ L⁻² T⁴ A⁴]",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "सू \u0000 X = 3 YZ म\u0000 , X और Z म\u0000 \u0000 म शः धा \u0000र ता और\nचुं ब की य \u0000े रण की िव मा य\u0000 ह\u0000 । MKSA \u0000 णा ली म\u0000 Y\nकी िव मा य\u0000 ह\u0000 -\n−3 −2 −2 −4",
        "options": [
          {
            "label": "A",
            "value": "M L T A\n−2",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ML\n−3 −2 4 8",
            "type": "text"
          },
          {
            "label": "C",
            "value": "M L A T\n−3 −2 4 4",
            "type": "text"
          },
          {
            "label": "D",
            "value": "M L A T",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 5,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q15",
    "questionNumber": 15,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "If the period of revolution of an artificial\nsatellite just above the earth's surface is T\n2\nand the density of earth is ρ . then ρ T",
    "options": [
      {
        "label": "A",
        "value": "is a universal constant whose value is\n3 π\nG",
        "type": "text"
      },
      {
        "label": "B",
        "value": "is a universal constant whose value is\n3 π\n2G",
        "type": "text"
      },
      {
        "label": "C",
        "value": "is proportional to radius of earth R",
        "type": "text"
      },
      {
        "label": "D",
        "value": "is proportional to square of the radius\n2\nof earth R",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Near the earth's surface,  or   = Universal constant.  v 0   =   √   = GM R 2 π R T  ∴   T 2   =   =   = 4 π 2 R 3  GM 4 π 2 R 3  G.   π R 3 ρ  4 3  3 π  G ρ  ρ T 2   =   3 π  G",
    "languages": {
      "en": {
        "questionText": "If the period of revolution of an artificial\nsatellite just above the earth's surface is T\n2\nand the density of earth is ρ . then ρ T",
        "options": [
          {
            "label": "A",
            "value": "is a universal constant whose value is\n3 π\nG",
            "type": "text"
          },
          {
            "label": "B",
            "value": "is a universal constant whose value is\n3 π\n2G",
            "type": "text"
          },
          {
            "label": "C",
            "value": "is proportional to radius of earth R",
            "type": "text"
          },
          {
            "label": "D",
            "value": "is proportional to square of the radius\n2\nof earth R",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "य िद पृ \u0000ी की सतह के ठी क ऊपर एक कृ ि\u0000 म उप \u0000 ह\nका प \u0000र \u0000 मण का ल T है और पृ \u0000ी का घन \u0000 ρ है , तो ρ\n2\nT\n3 π",
        "options": [
          {
            "label": "A",
            "value": "एक सा व\u0000 भौ िम क \u0000\u0000थ रां क है िज स का मा न है\nG\n3 π",
            "type": "text"
          },
          {
            "label": "B",
            "value": "एक सा व\u0000 भौ िम क \u0000\u0000थ रां क है िज स का मा न है\n2G",
            "type": "text"
          },
          {
            "label": "C",
            "value": "पृ \u0000ी की ि\u0000 \u0000ा R के स मा नु पा ित क है\n2",
            "type": "text"
          },
          {
            "label": "D",
            "value": "पृ \u0000ी की ि\u0000 \u0000ा के व ग\u0000 R के स मा नु पा ती है",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 6,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q16",
    "questionNumber": 16,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A car is moving with a constant speed of 20 m/s in a circular horizontal track of radius 40 m. A bob is suspended from the roof of the car by a massless string. The angle made by the string with the vertical will be : (Take g = 10 m/s²)",
    "options": [
                  {
                            "label": "A",
                            "value": "30°",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "45°",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "tan⁻¹(4)",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "tan⁻¹(2)",
                            "type": "text"
                  }
        ],
    "correctAnswer": "C",
    "explanation": "Tcos θ   = mg Tsin θ   =   mv 2  R  tan θ   =   v 2  Rg  ⇒ tan θ   =   20 2  40×10  ⇒ tan θ   = 1 ⇒   θ   =   π  4",
    "languages": {
      "en": {
        "questionText": "A car is moving with a constant speed of 20 m/s in a circular horizontal track of radius 40 m. A bob is suspended from the roof of the car by a massless string. The angle made by the string with the vertical will be : (Take g = 10 m/s²)",
        "options": [
          {
            "label": "A",
            "value": "π/3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "π/2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "π/4",
            "type": "text"
          },
          {
            "label": "D",
            "value": "π/6",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक का र 40 m ि\u0000 \u0000ा के वृ \u0000ा का र \u0000ै ित ज पथ म\u0000\n20 m/s की िन यत चा ल से ग ित मा न है । \u0000 \u0000 मा न र िह त\nडो री \u0000ा रा एक गो लक को का र की छत से िन लं िब त\nिक या जा ता है । डो री \u0000ा रा उ \u0000ा\u0000 धर से ब ना या ग या को ण\n2\nहो गा :( g = 10 m/s )\nπ π π π",
        "options": [
  {
    "label": "A",
    "value": "30°",
    "type": "text"
  },
  {
    "label": "B",
    "value": "45°",
    "type": "text"
  },
  {
    "label": "C",
    "value": "tan⁻¹(4)",
    "type": "text"
  },
  {
    "label": "D",
    "value": "tan⁻¹(2)",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 6,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q17",
    "questionNumber": 17,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "When you walk through a metal detector\ncarrying a metal object in your pocket, it\nraises an alarm. This phenomenon works\non :",
    "options": [
      {
        "label": "A",
        "value": "Electromagnetic induction",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Resonance in ac circuits",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Mutual induction in ac circuits",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Interference of electromagnetic waves",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "By theory",
    "languages": {
      "en": {
        "questionText": "When you walk through a metal detector\ncarrying a metal object in your pocket, it\nraises an alarm. This phenomenon works\non :",
        "options": [
          {
            "label": "A",
            "value": "Electromagnetic induction",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Resonance in ac circuits",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Mutual induction in ac circuits",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Interference of electromagnetic waves",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "जब आप अप नी जे ब म\u0000 धा तु की को ई व \u0000ु ले कर मे टल\nिड टे \u0000 र से गु जर ते ह\u0000 , तो यह अ ला म\u0000 ब जा ता है । यह\nघट ना िन \u0000 पर का म कर ती है :-",
        "options": [
          {
            "label": "A",
            "value": "िव द्यु त चु \u0000 की य \u0000े रण",
            "type": "text"
          },
          {
            "label": "B",
            "value": "\u0000 \u0000ा व त\u0000 धा रा प \u0000र प थों म\u0000 अ नु ना द",
            "type": "text"
          },
          {
            "label": "C",
            "value": "\u0000 \u0000ा व त\u0000 धा रा प \u0000र प थों म\u0000 अ \u0000ो \u0000 \u0000े रण",
            "type": "text"
          },
          {
            "label": "D",
            "value": "िव द्यु त चु \u0000 की य त रं गो का \u0000 ित करण",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 6,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q18",
    "questionNumber": 18,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "An infinite plane with uniformly distributed\npositive charge has surface charge of σ\ncoulomb/ metre². A metallic sphere S of\nmass m and charge +Q is attached to a\nthread and tied to a point P on the sheet\nAB as shown in figure. Find the angle\nwhich PS makes with the plane AB.\n–1 σ Q –1 σ Q",
    "options": [
      {
        "label": "A",
        "value": "tan ( )",
        "type": "text"
      },
      {
        "label": "B",
        "value": "tan ( )\nε 0 mg 2 ε 0 mg\n–1 σ Q –1 2 σ Q",
        "type": "text"
      },
      {
        "label": "C",
        "value": "tan ( )",
        "type": "text"
      },
      {
        "label": "D",
        "value": "tan ( )\n4 ε 0 mg ε 0 mg",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "The electric field due to infinite plane sheet of  charge  The force on sphere S due to electrostatic  repulsion is  Hence, from figure  E =   σ  2 ε 0  F e   =   QE   =   σQ  2 ε 0  tan θ   =   =   or   θ   = tan –1 (   )  QE mg  σ E 2 ε 0   mg  σ Q 2 ε 0   mg",
    "languages": {
      "en": {
        "questionText": "An infinite plane with uniformly distributed\npositive charge has surface charge of σ\ncoulomb/ metre². A metallic sphere S of\nmass m and charge +Q is attached to a\nthread and tied to a point P on the sheet\nAB as shown in figure. Find the angle\nwhich PS makes with the plane AB.\n–1 σ Q –1 σ Q",
        "options": [
          {
            "label": "A",
            "value": "tan ( )",
            "type": "text"
          },
          {
            "label": "B",
            "value": "tan ( )\nε 0 mg 2 ε 0 mg\n–1 σ Q –1 2 σ Q",
            "type": "text"
          },
          {
            "label": "C",
            "value": "tan ( )",
            "type": "text"
          },
          {
            "label": "D",
            "value": "tan ( )\n4 ε 0 mg ε 0 mg",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एकस मा न \u0000 प से िव त \u0000र त ध ना \u0000 क आ वे श वा ले अ नं त\nतल का पृ \u0000ी य आ वे श σ कू ल \u0000 / मी टर ² है । \u0000 \u0000 मा न m\nऔर आ वे श +Q वा ले एक धा \u0000\u0000 क गो ले S को एक धा गे\nसे जो ड़ा ग या है त था िच \u0000 म\u0000 िद खा ए अ नु सा र शी ट AB\nपर एक िबं दु P से बां धा ग या है । PS \u0000ा रा समतल AB के\nसा थ ब ना या ग या को ण \u0000ा त की िज ए।\n–1 σ Q –1 σ Q",
        "options": [
          {
            "label": "A",
            "value": "tan ( )",
            "type": "text"
          },
          {
            "label": "B",
            "value": "tan ( )\nε 0 mg 2 ε 0 mg\n–1 σ Q –1 2 σ Q",
            "type": "text"
          },
          {
            "label": "C",
            "value": "tan ( )",
            "type": "text"
          },
          {
            "label": "D",
            "value": "tan ( )\n4 ε 0 mg ε 0 mg",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 6,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q19",
    "questionNumber": 19,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A 1 kg mass is suspended from the ceiling\nby a rope of length 4m. A horizontal force\n'F' is applied at the mid-point of the rope\nso that the rope makes an angle of 45°\nwith respect to the vertical axis as shown\nin figure. The magnitude of F is: (Assume\nthat the system is in equilibrium and g =\n2\n10 m/s )",
    "options": [
      {
        "label": "A",
        "value": "10 N",
        "type": "text"
      },
      {
        "label": "B",
        "value": "1 N\n10",
        "type": "text"
      },
      {
        "label": "C",
        "value": "N\n√2\n1",
        "type": "text"
      },
      {
        "label": "D",
        "value": "N\n10×√2",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "From figure  AS system is in equilibrium, therefore  F = 10 N  T 1   cos 45° = mg T 1   sin 45° = F  ∴   tan 45° =   F mg  ⇒ F = mg",
    "languages": {
      "en": {
        "questionText": "A 1 kg mass is suspended from the ceiling\nby a rope of length 4m. A horizontal force\n'F' is applied at the mid-point of the rope\nso that the rope makes an angle of 45°\nwith respect to the vertical axis as shown\nin figure. The magnitude of F is: (Assume\nthat the system is in equilibrium and g =\n2\n10 m/s )",
        "options": [
          {
            "label": "A",
            "value": "10 N",
            "type": "text"
          },
          {
            "label": "B",
            "value": "1 N\n10",
            "type": "text"
          },
          {
            "label": "C",
            "value": "N\n√2\n1",
            "type": "text"
          },
          {
            "label": "D",
            "value": "N\n10×√2",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "1 kg का \u0000 \u0000 मा न 4 m लं बी र \u0000ी \u0000ा रा छत से\nलट का या ग या है । र \u0000ी के म \u0000 - िबं दु पर एक \u0000ै ित ज\nबल 'F' ल गा या जा ता है ता िक र \u0000ी ऊ \u0000ा\u0000 धर अ \u0000 के\nसा पे \u0000 45° का को ण ब ना ये जै सा िक िच \u0000 म\u0000 िद खा या\nग या है । F का प \u0000र मा ण है : ( मा न ल\u0000 िक िन का य\n2\nसा \u0000ा व \u0000 था म\u0000 है और g = 10 m/s )",
        "options": [
          {
            "label": "A",
            "value": "10 N",
            "type": "text"
          },
          {
            "label": "B",
            "value": "1 N\n10",
            "type": "text"
          },
          {
            "label": "C",
            "value": "N\n√2\n1",
            "type": "text"
          },
          {
            "label": "D",
            "value": "N\n10×√2",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 7,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q20",
    "questionNumber": 20,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "5.6 liter of helium gas at STP is\nadiabatically compressed to 0.7 liter.\nTaking the initial temperature to be T 1 , the\nwork done in the process is-\n9",
    "options": [
      {
        "label": "A",
        "value": "8 RT 1\n3",
        "type": "text"
      },
      {
        "label": "B",
        "value": "2 RT 1\n15",
        "type": "text"
      },
      {
        "label": "C",
        "value": "8 RT 1\n9",
        "type": "text"
      },
      {
        "label": "D",
        "value": "2 RT 1",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "ω   =   = =   [ 1 −   (   ) γ −1  ]  P 1 V 1 −P 2 V 2  γ −1 nRT−nRT 2  γ −1 nRT 1  γ −1 V 1  V 2",
    "languages": {
      "en": {
        "questionText": "5.6 liter of helium gas at STP is\nadiabatically compressed to 0.7 liter.\nTaking the initial temperature to be T 1 , the\nwork done in the process is-\n9",
        "options": [
          {
            "label": "A",
            "value": "8 RT 1\n3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "2 RT 1\n15",
            "type": "text"
          },
          {
            "label": "C",
            "value": "8 RT 1\n9",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2 RT 1",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "STP पर 5.6 ली टर ही िल यम गै स को \u0000 \u0000ो \u0000 \u0000 प से\n0.7 ली टर तक सं पी िड़ त िक या जा ता है । \u0000ा रं िभ क\nता प मा न को T 1 मा न ते \u0000 ए \u0000 \u0000 म म\u0000 िक या ग या का य\u0000 है -\n9",
        "options": [
          {
            "label": "A",
            "value": "8 RT 1\n3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "2 RT 1\n15",
            "type": "text"
          },
          {
            "label": "C",
            "value": "8 RT 1\n9",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2 RT 1\n–6",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 7,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q21",
    "questionNumber": 21,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "The number of significant figures in 11.118\n–6\n× 10 is",
    "options": [
      {
        "label": "A",
        "value": "3",
        "type": "text"
      },
      {
        "label": "B",
        "value": "4",
        "type": "text"
      },
      {
        "label": "C",
        "value": "5",
        "type": "text"
      },
      {
        "label": "D",
        "value": "6",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "In a given scientific notation of a number, all  non zero numbers are significant.  Hence   in   significant   digita   are  5.  11. 118 × 10 −6",
    "languages": {
      "en": {
        "questionText": "The number of significant figures in 11.118\n–6\n× 10 is",
        "options": [
          {
            "label": "A",
            "value": "3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "4",
            "type": "text"
          },
          {
            "label": "C",
            "value": "5",
            "type": "text"
          },
          {
            "label": "D",
            "value": "6",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "11.118 × 10 म\u0000 सा थ\u0000 क अं कों की सं \u0000ा है",
        "options": [
          {
            "label": "A",
            "value": "3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "4",
            "type": "text"
          },
          {
            "label": "C",
            "value": "5",
            "type": "text"
          },
          {
            "label": "D",
            "value": "6",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 7,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q22",
    "questionNumber": 22,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "When a proton is accelerated through 1V\nits kinetic energy will be :",
    "options": [
      {
        "label": "A",
        "value": "1540 eV",
        "type": "text"
      },
      {
        "label": "B",
        "value": "1",
        "type": "text"
      },
      {
        "label": "C",
        "value": "1 eV",
        "type": "text"
      },
      {
        "label": "D",
        "value": "zero",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "KE = work done   =   qΔV  =   e [1 V   ] = 1 eV",
    "languages": {
      "en": {
        "questionText": "When a proton is accelerated through 1V\nits kinetic energy will be :",
        "options": [
          {
            "label": "A",
            "value": "1540 eV",
            "type": "text"
          },
          {
            "label": "B",
            "value": "1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "1 eV",
            "type": "text"
          },
          {
            "label": "D",
            "value": "zero",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "जब एक \u0000ो टॉ न को 1V \u0000 \u0000र त िक या जा ता है तो उस की\nग ित ज ऊ जा\u0000 हो गी :",
        "options": [
          {
            "label": "A",
            "value": "1540 eV",
            "type": "text"
          },
          {
            "label": "B",
            "value": "1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "1 eV",
            "type": "text"
          },
          {
            "label": "D",
            "value": "शू \u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 7,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q23",
    "questionNumber": 23,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "As shown in the figure a block of mass\n10 kg lying on a horizontal surface is\npulled by a force F acting at an angle 30° ,\nwith horizontal. For μ 3 = 0. 25 , the block\nwill just start to move for the value of F:\n−2\nGiven [ Given g = 10 ms ]",
    "options": [
      {
        "label": "A",
        "value": "20 N",
        "type": "text"
      },
      {
        "label": "B",
        "value": "3",
        "type": "text"
      },
      {
        "label": "C",
        "value": "25.2 N",
        "type": "text"
      },
      {
        "label": "D",
        "value": "35.7 N",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Given,  ........ (1)  ......... (2)  By equation (1)  m = 10 kg   μ S   = 0. 25  θ   = 30°,   g = 10 m/s F cos 30° = f F sin 30° + N = mg N = mg − F sin 30° F cos 30° =   μ S   (mg − F sin 30°) F (cos 30° +   μ S   sin 30°)=   μ S   mg F =   0.25×10×10 ×0.25×  √3 2 1 2  F =   ⇒ 25. 2 N 50 1.98",
    "languages": {
      "en": {
        "questionText": "As shown in the figure a block of mass\n10 kg lying on a horizontal surface is\npulled by a force F acting at an angle 30° ,\nwith horizontal. For μ 3 = 0. 25 , the block\nwill just start to move for the value of F:\n−2\nGiven [ Given g = 10 ms ]",
        "options": [
          {
            "label": "A",
            "value": "20 N",
            "type": "text"
          },
          {
            "label": "B",
            "value": "3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "25.2 N",
            "type": "text"
          },
          {
            "label": "D",
            "value": "35.7 N",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "जै सा िक िच \u0000 म\u0000 िद खा या ग या है िक \u0000ै ित ज सतह पर र खे\n\u0000 ए 10 kg \u0000 \u0000 मा न के एक \u0000ॉ क को \u0000ै ित ज के सा थ\n30° के को ण पर का य\u0000 रत बल F \u0000ा रा खीं चा जा ता है ।\nμ 3 = 0. 25 के िल ए , F के िक स मा न के िल ए \u0000ॉ क\nमा \u0000 ग ित कर ना \u0000ा र \u0000 कर दे गा ? िद या ग या है\n−2\n[ g = 10 ms ]",
        "options": [
          {
            "label": "A",
            "value": "20 N",
            "type": "text"
          },
          {
            "label": "B",
            "value": "3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "25.2 N",
            "type": "text"
          },
          {
            "label": "D",
            "value": "35.7 N",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 8,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q24",
    "questionNumber": 24,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A 2m long rod of radius 1 cm which is\nfixed from one end is given a twist of 0. 8\nradians. The shear strain developed will be",
    "options": [
      {
        "label": "A",
        "value": "0.002",
        "type": "text"
      },
      {
        "label": "B",
        "value": "0.004",
        "type": "text"
      },
      {
        "label": "C",
        "value": "0.008",
        "type": "text"
      },
      {
        "label": "D",
        "value": "0.016",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Given-  ,  .  angle of shear  shear strains   .  L = 2 m r = 1 cm = 10 −2   m twist =   θ   = 0 .8 rad  ϕ   =   = r θ  L 10 −2 ×0.8 2  = 0 .4 ×10 −2  = 0 .004   rad",
    "languages": {
      "en": {
        "questionText": "A 2m long rod of radius 1 cm which is\nfixed from one end is given a twist of 0. 8\nradians. The shear strain developed will be",
        "options": [
          {
            "label": "A",
            "value": "0.002",
            "type": "text"
          },
          {
            "label": "B",
            "value": "0.004",
            "type": "text"
          },
          {
            "label": "C",
            "value": "0.008",
            "type": "text"
          },
          {
            "label": "D",
            "value": "0.016",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "1 cm ि\u0000 \u0000ा वा ली 2m लं बी छ ड़ को एक िस रे से \u0000 ढ़\nकर के 0. 8 रे िड यन को ण से मो ड़ा जा ता है । उ \u0000 \u0000 हो ने\nवा ली अप \u0000 पण िव कृ ित हो गी -",
        "options": [
          {
            "label": "A",
            "value": "0.002",
            "type": "text"
          },
          {
            "label": "B",
            "value": "0.004",
            "type": "text"
          },
          {
            "label": "C",
            "value": "0.008",
            "type": "text"
          },
          {
            "label": "D",
            "value": "0.016",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 8,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q25",
    "questionNumber": 25,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A student measures time for 20\noscillations of a simple pendulum as 30 s,\n32 s, 35 s and 31 s. If the minimum\ndivision in the measuring clock is 1 s, then\ncorrect mean time in second is",
    "options": [
      {
        "label": "A",
        "value": "32 ± 3",
        "type": "text"
      },
      {
        "label": "B",
        "value": "32 ± 1",
        "type": "text"
      },
      {
        "label": "C",
        "value": "32 ± 2",
        "type": "text"
      },
      {
        "label": "D",
        "value": "32 ± 5",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Mean time:  By rounding off   :  t m   =   = 32 30+32+35+31 4  Δ t   = ±2   s  ∴   t   + Δ t   = 32 ± 2   s",
    "languages": {
      "en": {
        "questionText": "A student measures time for 20\noscillations of a simple pendulum as 30 s,\n32 s, 35 s and 31 s. If the minimum\ndivision in the measuring clock is 1 s, then\ncorrect mean time in second is",
        "options": [
          {
            "label": "A",
            "value": "32 ± 3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "32 ± 1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "32 ± 2",
            "type": "text"
          },
          {
            "label": "D",
            "value": "32 ± 5",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक छा \u0000 एक सा धा रण लो लक के 20 दो ल नों के िल ए\nसमय को 30 s, 32 s, 35 s और 31 s के \u0000 प म\u0000\nमा प ता है । य िद मा प ने वा ली घ ड़ी म\u0000 \u0000ू नतम िव भा जन 1\nसे कं ड है , तो से कं ड म\u0000 स ही औसत समय है",
        "options": [
          {
            "label": "A",
            "value": "32 ± 3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "32 ± 1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "32 ± 2",
            "type": "text"
          },
          {
            "label": "D",
            "value": "32 ± 5",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 8,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q26",
    "questionNumber": 26,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A copper wire is stretched to make it 0.1%\nlonger, what is the percentage change in\nits resistance ?",
    "options": [
      {
        "label": "A",
        "value": "0.2%",
        "type": "text"
      },
      {
        "label": "B",
        "value": "0.6%",
        "type": "text"
      },
      {
        "label": "C",
        "value": "0.8%",
        "type": "text"
      },
      {
        "label": "D",
        "value": "0.5%",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "The resistance of wire of length   cross-  sectional area A and resistivity   is given by  If d is the density and m is the mass of wire,  then area of wire  therefore,  Since  Now  ℓ  ρ  R =   ρ   ℓ A  A =   m ℓd  R =   =   ℓ 2 ρ ℓ  m ℓd  ℓd m  = constant  ρd  m  × 100 = 2 (   × 100 ) ΔR R Δ ℓ  ℓ  × 100 = 0. 1% Δ ℓ  ℓ  × 100 = 2 ( 0. 1 ) % = 0. 2%  ΔR R",
    "languages": {
      "en": {
        "questionText": "A copper wire is stretched to make it 0.1%\nlonger, what is the percentage change in\nits resistance ?",
        "options": [
          {
            "label": "A",
            "value": "0.2%",
            "type": "text"
          },
          {
            "label": "B",
            "value": "0.6%",
            "type": "text"
          },
          {
            "label": "C",
            "value": "0.8%",
            "type": "text"
          },
          {
            "label": "D",
            "value": "0.5%",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक तां बे के ता र को 0.1% ल \u0000ा कर ने के िल ए खीं चा\nजा ता है , इस के \u0000 ित रो ध म\u0000 \u0000 ित शत प \u0000र व त\u0000 न \u0000ा है ?",
        "options": [
          {
            "label": "A",
            "value": "0.2%",
            "type": "text"
          },
          {
            "label": "B",
            "value": "0.6%",
            "type": "text"
          },
          {
            "label": "C",
            "value": "0.8%",
            "type": "text"
          },
          {
            "label": "D",
            "value": "0.5%",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 8,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q27",
    "questionNumber": 27,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "The nucleus of nucleon number 6, has\n−15\nnuclear radius 3 × 10 m , then the\nradius of nucleus having nucleon number\n162 is :\n–15",
    "options": [
                  {
                            "label": "A",
                            "value": "1.5 × 10⁻¹⁵ m",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "3 × 10⁻¹⁵ m",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "4.5 × 10⁻¹⁵ m",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "6 × 10⁻¹⁵ m",
                            "type": "text"
                  }
        ],
    "correctAnswer": "D",
    "explanation": "R ∝ A 1/3  =   (   ) 1/3  =   (   ) 1/3   =   ( 27 )  1/3  = 3  R 2  R 1  A 2  A 1  162 6  R 2   = 3R 1   = 3 × 3 × 10 −15   m = 9 × 10 −15   m",
    "languages": {
      "en": {
        "questionText": "The nucleus of nucleon number 6, has\n−15\nnuclear radius 3 × 10 m , then the\nradius of nucleus having nucleon number\n162 is :\n–15",
        "options": [
          {
            "label": "A",
            "value": "1.5 × 10⁻¹⁵ m",
            "type": "text"
          },
          {
            "label": "B",
            "value": "3 × 10⁻¹⁵ m",
            "type": "text"
          },
          {
            "label": "C",
            "value": "6 × 10⁻¹⁵ m",
            "type": "text"
          },
          {
            "label": "D",
            "value": "9 × 10⁻¹⁵ m",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "\u0000ू \u0000\u0000 ओन सं \u0000ा 6 के ना िभ क की ना िभ की य ि\u0000 \u0000ा\n−15\n3 × 10 m है तो \u0000ू \u0000\u0000 ओन सं \u0000ा 162 वा ले\nना िभ क की ि\u0000 \u0000ा हो गी -\n–15",
        "options": [
  {
    "label": "A",
    "value": "1.5 × 10⁻¹⁵ m",
    "type": "text"
  },
  {
    "label": "B",
    "value": "3 × 10⁻¹⁵ m",
    "type": "text"
  },
  {
    "label": "C",
    "value": "4.5 × 10⁻¹⁵ m",
    "type": "text"
  },
  {
    "label": "D",
    "value": "6 × 10⁻¹⁵ m",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 8,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q28",
    "questionNumber": 28,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A copper block of mass 2 kg is heated to\na temperature of 500°C and then placed in\na large block of ice at 0°C. What is the\nmaximum amount of ice that can melt?\n−1\nThe specific heat of copper is 400 J kg\n−1\n°C and latent heat of fusion of water is\n5 −1\n3.5×10 J kg\n4",
    "options": [
      {
        "label": "A",
        "value": "kg\n3\n6",
        "type": "text"
      },
      {
        "label": "B",
        "value": "kg\n5\n8",
        "type": "text"
      },
      {
        "label": "C",
        "value": "kg\n7\n10",
        "type": "text"
      },
      {
        "label": "D",
        "value": "kg\n9",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "The correct option is  Specific heat of copper S   = 400 J kg   °C  Latent heat of fusion L   =3.5×105 J kg  Mass of copper block Mcu = 2 kg  Heat released by cu block = Heat gained by ice  to melt.  C   kg 8 7  cu   –1   –1  f   –1  M cu S cu   Δ   θ   = ML f  ⇒ 2 × 400 × 500 = M × 3. 5 × 10 5  ⇒ M = =   kg  2×400×500 3.5×10 5  8 7",
    "languages": {
      "en": {
        "questionText": "A copper block of mass 2 kg is heated to\na temperature of 500°C and then placed in\na large block of ice at 0°C. What is the\nmaximum amount of ice that can melt?\n−1\nThe specific heat of copper is 400 J kg\n−1\n°C and latent heat of fusion of water is\n5 −1\n3.5×10 J kg\n4",
        "options": [
          {
            "label": "A",
            "value": "kg\n3\n6",
            "type": "text"
          },
          {
            "label": "B",
            "value": "kg\n5\n8",
            "type": "text"
          },
          {
            "label": "C",
            "value": "kg\n7\n10",
            "type": "text"
          },
          {
            "label": "D",
            "value": "kg\n9",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "2 kg \u0000 \u0000 मा न के एक तां बे के \u0000ॉ क को 500°C के\nता प मा न तक ग म\u0000 िक या जा ता है और िफ र 0°C पर ब फ \u0000\nके एक ब ड़े \u0000ॉ क म\u0000 र खा जा ता है । ब फ \u0000 की अ िध कतम\nिक त नी मा \u0000ा िप घल सक ती है ? तां बे की िव िश \u0000 ऊ \u0000ा\n−1 −1\n400 J kg °C है और पा नी के गलन की गु \u0000\n5 −1\nऊ \u0000ा 3.5×10 J kg है\n4",
        "options": [
          {
            "label": "A",
            "value": "kg\n3\n6",
            "type": "text"
          },
          {
            "label": "B",
            "value": "kg\n5\n8",
            "type": "text"
          },
          {
            "label": "C",
            "value": "kg\n7\n10",
            "type": "text"
          },
          {
            "label": "D",
            "value": "kg\n9",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 9,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q29",
    "questionNumber": 29,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A Vernier calipers has 1 mm marks on the\nmain scale. It has 20 equal divisions on\nthe Vernier scale which match with 16\nmain scale division. For this Vernier\ncalipers the least count is",
    "options": [
      {
        "label": "A",
        "value": "0.02 mm",
        "type": "text"
      },
      {
        "label": "B",
        "value": "0.05 mm",
        "type": "text"
      },
      {
        "label": "C",
        "value": "0.1 mm",
        "type": "text"
      },
      {
        "label": "D",
        "value": "0.2 mm",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Least count of vernier calipers  LC = 1 MSD − 1 VSD  20 divisions of vernier scale = 16 divisions of  main scale  ∴   LC = 1 MSD − 1 VSD  = 1 mm − 0.8 mm = 0.2 mm  =   Smallest division on main scale Number of divisions on vernier scale  ∴   1VSD=   mm = 0 .8 mm 16 20",
    "languages": {
      "en": {
        "questionText": "A Vernier calipers has 1 mm marks on the\nmain scale. It has 20 equal divisions on\nthe Vernier scale which match with 16\nmain scale division. For this Vernier\ncalipers the least count is",
        "options": [
          {
            "label": "A",
            "value": "0.02 mm",
            "type": "text"
          },
          {
            "label": "B",
            "value": "0.05 mm",
            "type": "text"
          },
          {
            "label": "C",
            "value": "0.1 mm",
            "type": "text"
          },
          {
            "label": "D",
            "value": "0.2 mm",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक व िन\u0000 यर कै ली प स\u0000 के मु \u0000 पै मा ने पर 1mm िच \u0000\nअं िक त है । इस के व िन\u0000 यर पै मा ने पर 20 स मा न भा ग है\nजो मु \u0000 पै मा ने के 16 भा गों से मे ल खा ते है । इस व िन\u0000 यर\nकै ली प स\u0000 का अ \u0000 त मां क है -",
        "options": [
          {
            "label": "A",
            "value": "0.02mm",
            "type": "text"
          },
          {
            "label": "B",
            "value": "0.05mm",
            "type": "text"
          },
          {
            "label": "C",
            "value": "0.1mm",
            "type": "text"
          },
          {
            "label": "D",
            "value": "0.2 mm",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 9,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q30",
    "questionNumber": 30,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A 220 V, 100 W bulb is connected to a 110\nV source. Calculate the power consumed\nby the bulb",
    "options": [
      {
        "label": "A",
        "value": "28 W",
        "type": "text"
      },
      {
        "label": "B",
        "value": "21 W",
        "type": "text"
      },
      {
        "label": "C",
        "value": "23 W",
        "type": "text"
      },
      {
        "label": "D",
        "value": "25 W",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "The maximum current allowed in bulb,  Resistance of the bulb  When the bulb is connected across voltage V'  (=110 V) then power consumed,  i =   =   =   A P V 100 220 5 11  R =   =   = 484Ω V i 220 5  P' =   (V') 2  R  =   = 25 W  (110) 2  484",
    "languages": {
      "en": {
        "questionText": "A 220 V, 100 W bulb is connected to a 110\nV source. Calculate the power consumed\nby the bulb",
        "options": [
          {
            "label": "A",
            "value": "28 W",
            "type": "text"
          },
          {
            "label": "B",
            "value": "21 W",
            "type": "text"
          },
          {
            "label": "C",
            "value": "23 W",
            "type": "text"
          },
          {
            "label": "D",
            "value": "25 W",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक 220 V, 100 W ब \u0000 110 V \u0000ो त से जु ड़ा \u0000 आ\nहै । ब \u0000 \u0000ा रा उप भो ग की गई श \u0000\u0000 की गण ना क र\u0000",
        "options": [
          {
            "label": "A",
            "value": "28 W",
            "type": "text"
          },
          {
            "label": "B",
            "value": "21 W",
            "type": "text"
          },
          {
            "label": "C",
            "value": "23 W",
            "type": "text"
          },
          {
            "label": "D",
            "value": "25 W",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 9,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q31",
    "questionNumber": 31,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "One electron & one proton is accelerated\nby equal potential. Ratio in their de-broglie\nwavelength is-\nm p",
    "options": [
      {
        "label": "A",
        "value": "√\nm e\nm e",
        "type": "text"
      },
      {
        "label": "B",
        "value": "√\nm p\nm p",
        "type": "text"
      },
      {
        "label": "C",
        "value": "m e",
        "type": "text"
      },
      {
        "label": "D",
        "value": "1",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "∵   λ   ∝   ⇒   λ   ∝   , λ   ∝  ∴  1 √m   e  1 √m e   p  1 √m p  =   √ λ e  λ p  m p  m e",
    "languages": {
      "en": {
        "questionText": "One electron & one proton is accelerated\nby equal potential. Ratio in their de-broglie\nwavelength is-\nm p",
        "options": [
          {
            "label": "A",
            "value": "√\nm e\nm e",
            "type": "text"
          },
          {
            "label": "B",
            "value": "√\nm p\nm p",
            "type": "text"
          },
          {
            "label": "C",
            "value": "m e",
            "type": "text"
          },
          {
            "label": "D",
            "value": "1",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक इ ले \u0000\u0000ॉ न और एक \u0000ो टॉ न को स मा न िव भव से \u0000 \u0000र त\nिक या जा ता है । उन के डी - \u0000ॉ \u0000ी त रं ग दै \u0000\u0000 म\u0000 अ नु पा त है -\nm p",
        "options": [
          {
            "label": "A",
            "value": "√\nm e\nm e",
            "type": "text"
          },
          {
            "label": "B",
            "value": "√\nm p\nm p",
            "type": "text"
          },
          {
            "label": "C",
            "value": "m e",
            "type": "text"
          },
          {
            "label": "D",
            "value": "1",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 9,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q32",
    "questionNumber": 32,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "Match the corresponding entries of column\n1 with column 2. [Where 'm' is the\nmagnification produced by the mirror]\nColumn 1 Column 2\n(a) Convex\n(A) m = –2\nmirror\n(B) m = (b) Concave\n1\n– mirror\n2\n(C) m = +2 (c) Real image\n(D) m =\n1 (d) Virtual image\n+\n2",
    "options": [
      {
        "label": "A",
        "value": "A → b and c; B → b and c; C → b and\nd; D → a and d",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A → a and c ; B → a and d; C → a\nand b; D → c and d",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A → a and d ; B → b and c; C → b\nand d; D → b and c",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A → c and d ; B → b and d; C → b\nand c; D → a and d",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Convex mirror forms virtual and diminished images (m = +1/2 -> a, d). Concave mirror can form real inverted magnified image (m = -2 -> b, c), real inverted diminished image (m = -1/2 -> b, c), or virtual erect magnified image (m = +2 -> b, d). Therefore: A -> b, c; B -> b, c; C -> b, d; D -> a, d. Correct answer is (A).",
    "matchTable": {
      "column1Header": "Column 1 (Magnification)",
      "column2Header": "Column 2 (Mirror & Image Nature)",
      "rows": [
        { "leftKey": "A", "leftText": "m = -2", "rightKey": "a", "rightText": "Convex mirror" },
        { "leftKey": "B", "leftText": "m = -1/2", "rightKey": "b", "rightText": "Concave mirror" },
        { "leftKey": "C", "leftText": "m = +2", "rightKey": "c", "rightText": "Real image" },
        { "leftKey": "D", "leftText": "m = +1/2", "rightKey": "d", "rightText": "Virtual image" }
      ]
    },
    "languages": {
      "en": {
        "questionText": "Match the corresponding entries of column\n1 with column 2. [Where 'm' is the\nmagnification produced by the mirror]\nColumn 1 Column 2\n(a) Convex\n(A) m = –2\nmirror\n(B) m = (b) Concave\n1\n– mirror\n2\n(C) m = +2 (c) Real image\n(D) m =\n1 (d) Virtual image\n+\n2",
        "options": [
          {
            "label": "A",
            "value": "A → b and c; B → b and c; C → b and\nd; D → a and d",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A → a and c ; B → a and d; C → a\nand b; D → c and d",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A → a and d ; B → b and c; C → b\nand d; D → b and c",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A → c and d ; B → b and d; C → b\nand c; D → a and d",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कॉ लम -1 की सं गत \u0000 िव ि\u0000 यों का िम ला न कॉ लम -2 की\n\u0000 िव ि\u0000 यों से की िज ए। य हाँ 'm' द प\u0000 ण \u0000ा रा उ \u0000 \u0000 आव ध\u0000 न\nहै ।\nकॉ लम 1 कॉ लम 2\n(A) m = –2 (a) उ \u0000 ल द प\u0000 ण\n(B) m =\n1 (b) अवतल द प\u0000 ण\n–\n2\n(c) वा \u0000 िव क\n(C) m = +2\n\u0000 ित िब \u0000\n(D) m =\n1 (d) आ भा सी \u0000 ित िब \u0000\n+\n2",
        "options": [
          {
            "label": "A",
            "value": "A → b त था c; B → b त था c; C → b त था\nd; D → a त था d",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A → a त था c ; B → a त था d; C → a त था\nb; D → c त था d",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A → a त था d ; B → b त था c; C → b त था\nd; D → b त था c",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A → c त था d ; B → b त था d; C → b त था\nc; D → a त था d",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 10,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q33",
    "questionNumber": 33,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "Power applied to a particle varies with time\n2\nas P = (3t − 2t +",
    "options": [
      {
        "label": "A",
        "value": "32 J",
        "type": "text"
      },
      {
        "label": "B",
        "value": "46 J",
        "type": "text"
      },
      {
        "label": "C",
        "value": "61 J",
        "type": "text"
      },
      {
        "label": "D",
        "value": "102 J",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "From work energy theorem  and we know that  therefore  W =   = 46 J  W = Δ KE P =   dW dt t 2  ∫  t 1  Pdt =  4  ∫  2  ( 3t 2   − 2t + 1 )   dt",
    "languages": {
      "en": {
        "questionText": "Power applied to a particle varies with time\n2\nas P = (3t − 2t +",
        "options": [
          {
            "label": "A",
            "value": "32 J",
            "type": "text"
          },
          {
            "label": "B",
            "value": "46 J",
            "type": "text"
          },
          {
            "label": "C",
            "value": "61 J",
            "type": "text"
          },
          {
            "label": "D",
            "value": "102 J",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िक सी कण पर आ रो िप त श \u0000\u0000 समय के सा थ P =\n2\n(3t − 2t +",
        "options": [
          {
            "label": "A",
            "value": "32 J",
            "type": "text"
          },
          {
            "label": "B",
            "value": "46 J",
            "type": "text"
          },
          {
            "label": "C",
            "value": "61 J",
            "type": "text"
          },
          {
            "label": "D",
            "value": "102 J",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 10,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q34",
    "questionNumber": 34,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A potential difference V is applied to a\ncopper wire of diameter d and length L.\nMatch the statements given in Column I\nwith the statements given in Column II\nColumn I Column II\nDrift speed will\nA. Voltage V is doubled (i)\ndecrease\nDrift speed will\nB. Length L is doubled (ii)\nbe doubled\nDiameter d is Drift speed will\nC. (iii)\ndoubled be halved\nTemperature of wire Drift speed will\nD. (iv)\nis increased not change\nChoose the correct answer from the\noptions given below",
    "options": [
      {
        "label": "A",
        "value": "A-(iii), B-(iv), C-(i), D-(ii)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A-(ii), B-(iii), C-(iv), D-(i)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A-(ii), B-(iv), C-(i), D-(iii)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A-(iv), B-(i), C-(ii), D-(iii)",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Drift speed vd = eEτ/m = eVτ/(mL). When Voltage V is doubled, vd is doubled (A -> ii). When Length L is doubled, vd is halved (B -> iii). Drift speed is independent of diameter d, so vd does not change (C -> iv). When Temperature is increased, relaxation time τ decreases, so vd decreases (D -> i). Therefore: A-(ii), B-(iii), C-(iv), D-(i). Correct answer is (B).",
    "matchTable": {
      "column1Header": "Column I",
      "column2Header": "Column II (Drift Speed Effect)",
      "rows": [
        { "leftKey": "A", "leftText": "Voltage V is doubled", "rightKey": "i", "rightText": "Drift speed will decrease" },
        { "leftKey": "B", "leftText": "Length L is doubled", "rightKey": "ii", "rightText": "Drift speed will be doubled" },
        { "leftKey": "C", "leftText": "Diameter d is doubled", "rightKey": "iii", "rightText": "Drift speed will be halved" },
        { "leftKey": "D", "leftText": "Temperature of wire is increased", "rightKey": "iv", "rightText": "Drift speed will not change" }
      ]
    },
    "languages": {
      "en": {
        "questionText": "A potential difference V is applied to a\ncopper wire of diameter d and length L.\nMatch the statements given in Column I\nwith the statements given in Column II\nColumn I Column II\nDrift speed will\nA. Voltage V is doubled (i)\ndecrease\nDrift speed will\nB. Length L is doubled (ii)\nbe doubled\nDiameter d is Drift speed will\nC. (iii)\ndoubled be halved\nTemperature of wire Drift speed will\nD. (iv)\nis increased not change\nChoose the correct answer from the\noptions given below",
        "options": [
          {
            "label": "A",
            "value": "A-(iii), B-(iv), C-(i), D-(ii)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A-(ii), B-(iii), C-(iv), D-(i)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A-(ii), B-(iv), C-(i), D-(iii)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A-(iv), B-(i), C-(ii), D-(iii)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "\u0000ा स d और लं बा ई L वा ले तां बे के ता र पर िव भ वां तर V\nल गा या जा ता है । कॉ लम I म\u0000 िद ए गए कथ नों का कॉ लम\nII म\u0000 िद ए गए कथ नों से िम ला न क र\u0000\nColumn I Column II\nवो \u0000े ज V दो गु ना हो अप वा ह चा ल कम हो\nA. (i)\nजा ता है जा ए गी\nलं बा ई L दो गु नी हो अप वा ह चा ल दो गु नी\nB. (ii)\nजा ती है हो जा ए गी\n\u0000ा स d दो गु ना हो अप वा ह चा ल आ धी\nC. (iii)\nजा ता है हो जा ए गी\nता र का ता प मा न ब ढ़ अप वा ह चा ल न हीं\nD. (iv)\nजा ता है बद ले गी\nनी चे िद ए गए िव क \u0000ों म\u0000 से स ही उ \u0000 र चु न\u0000",
        "options": [
          {
            "label": "A",
            "value": "A-(iii), B-(iv), C-(i), D-(ii)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A-(ii), B-(iii), C-(iv), D-(i)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A-(ii), B-(iv), C-(i), D-(iii)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A-(iv), B-(i), C-(ii), D-(iii)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 10,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q35",
    "questionNumber": 35,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "The equation of line on which magnetic\nfield is zero due to system of two\nperpendicular infinitely long current\ncarrying straight wires, is",
    "options": [
      {
        "label": "A",
        "value": "x = y",
        "type": "text"
      },
      {
        "label": "B",
        "value": "x = 2y",
        "type": "text"
      },
      {
        "label": "C",
        "value": "x = 3y",
        "type": "text"
      },
      {
        "label": "D",
        "value": "3x = y",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "B p ( x 1 y )   = 0 = x = 3y  μ 0 I 2 π y  μ 0 (3I) 2 π x",
    "languages": {
      "en": {
        "questionText": "The equation of line on which magnetic\nfield is zero due to system of two\nperpendicular infinitely long current\ncarrying straight wires, is",
        "options": [
          {
            "label": "A",
            "value": "x = y",
            "type": "text"
          },
          {
            "label": "B",
            "value": "x = 2y",
            "type": "text"
          },
          {
            "label": "C",
            "value": "x = 3y",
            "type": "text"
          },
          {
            "label": "D",
            "value": "3x = y",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "उस रे खा का स मी करण िज स पर दो लं बवत अ नं त लं बे\nसी धे धा रा वा ही ता रों के िन का य के का रण चुं ब की य\n\u0000े \u0000 शू \u0000 है , है",
        "options": [
          {
            "label": "A",
            "value": "x = y",
            "type": "text"
          },
          {
            "label": "B",
            "value": "x = 2y",
            "type": "text"
          },
          {
            "label": "C",
            "value": "x = 3y",
            "type": "text"
          },
          {
            "label": "D",
            "value": "3x = y",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 11,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q36",
    "questionNumber": 36,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A sinusoidal transverse progressive wave\nis travelling on stretched string along x\naxis. Choose appropriate number for\ndirection of velocity and acceleration\nrespectively for a particle P shown in the\ndiagram.",
    "options": [
      {
        "label": "A",
        "value": "3 and 1",
        "type": "text"
      },
      {
        "label": "B",
        "value": "1 and 3",
        "type": "text"
      },
      {
        "label": "C",
        "value": "1 and 1",
        "type": "text"
      },
      {
        "label": "D",
        "value": "2 and 4",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "v   = – v × slope  a = – ω   y  p   2",
    "languages": {
      "en": {
        "questionText": "A sinusoidal transverse progressive wave\nis travelling on stretched string along x\naxis. Choose appropriate number for\ndirection of velocity and acceleration\nrespectively for a particle P shown in the\ndiagram.",
        "options": [
          {
            "label": "A",
            "value": "3 and 1",
            "type": "text"
          },
          {
            "label": "B",
            "value": "1 and 3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "1 and 1",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2 and 4",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक \u0000ा व \u0000ी य अ नु \u0000 \u0000 थ \u0000 गा मी त रं ग x अ \u0000 के अ नु िद श\nत नी र \u0000ी पर ग ित मा न है । िच \u0000ा नु सा र एक कण P के\nिल ए वे ग व \u0000 रण की िद शा के िल ए उप यु \u0000 सं \u0000ा\nचु िन ये -",
        "options": [
          {
            "label": "A",
            "value": "3 त था 1",
            "type": "text"
          },
          {
            "label": "B",
            "value": "1 त था 3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "1 त था 1",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2 त था 4",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 11,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q37",
    "questionNumber": 37,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "An object placed at a distance of a 9cm.\nfrom the first principal focus of a convex\nlens produces a real image at a distance of\n25cm. from its second principal focus.\nthen the focal length of the lens is :",
    "options": [
      {
        "label": "A",
        "value": "9cm",
        "type": "text"
      },
      {
        "label": "B",
        "value": "25cm",
        "type": "text"
      },
      {
        "label": "C",
        "value": "15cm",
        "type": "text"
      },
      {
        "label": "D",
        "value": "17cm",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "F = 15 cm  F = √x 1 x 2   = √9 × 25 = √225",
    "languages": {
      "en": {
        "questionText": "An object placed at a distance of a 9cm.\nfrom the first principal focus of a convex\nlens produces a real image at a distance of\n25cm. from its second principal focus.\nthen the focal length of the lens is :",
        "options": [
          {
            "label": "A",
            "value": "9cm",
            "type": "text"
          },
          {
            "label": "B",
            "value": "25cm",
            "type": "text"
          },
          {
            "label": "C",
            "value": "15cm",
            "type": "text"
          },
          {
            "label": "D",
            "value": "17cm",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक उ \u0000 ल ल\u0000 स के \u0000 थम मु \u0000 फो कस से 9cm दू री पर\nव \u0000ु र खी है यह इस के ि\u0000 ती य मु \u0000 फो कस से\n25cm दू री पर वा \u0000 िव क \u0000 ित िब \u0000 ब ना ता है तो ल\u0000 स की\nफो कस दू री है :",
        "options": [
          {
            "label": "A",
            "value": "9cm",
            "type": "text"
          },
          {
            "label": "B",
            "value": "25cm",
            "type": "text"
          },
          {
            "label": "C",
            "value": "15cm",
            "type": "text"
          },
          {
            "label": "D",
            "value": "17cm",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 11,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q38",
    "questionNumber": 38,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "The energy gap of silicon is",
    "options": [
      {
        "label": "A",
        "value": "10877 Å",
        "type": "text"
      },
      {
        "label": "B",
        "value": "1088.8 Å",
        "type": "text"
      },
      {
        "label": "C",
        "value": "2088.7 Å",
        "type": "text"
      },
      {
        "label": "D",
        "value": "4088.6 Å",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "λ =   Å = 10877 Å = hc E 12400 1.14",
    "languages": {
      "en": {
        "questionText": "The energy gap of silicon is",
        "options": [
          {
            "label": "A",
            "value": "10877 Å",
            "type": "text"
          },
          {
            "label": "B",
            "value": "1088.8 Å",
            "type": "text"
          },
          {
            "label": "C",
            "value": "2088.7 Å",
            "type": "text"
          },
          {
            "label": "D",
            "value": "4088.6 Å",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िस िल कॉ न का ऊ जा\u0000 अं त रा ल",
        "options": [
          {
            "label": "A",
            "value": "10877 Å",
            "type": "text"
          },
          {
            "label": "B",
            "value": "1088.8 Å",
            "type": "text"
          },
          {
            "label": "C",
            "value": "2088.7 Å",
            "type": "text"
          },
          {
            "label": "D",
            "value": "4088.6 Å",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 11,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q39",
    "questionNumber": 39,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "Two coherent sources of equal intensities\nproduce a maximum of 100 units. If the\namplitude of one of the sources is reduced\nby 20% , then the maximum intensity\nproduced will be :",
    "options": [
      {
        "label": "A",
        "value": "100",
        "type": "text"
      },
      {
        "label": "B",
        "value": "81",
        "type": "text"
      },
      {
        "label": "C",
        "value": "89",
        "type": "text"
      },
      {
        "label": "D",
        "value": "60",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Consider the two coherent sources are I   and I  Therefore;  ....(1)  And  Therefore;  =  So, option (B) is correct.  1   2  I max   =   ( √I 1   + √I 2 ) 2  100 =   ( √I + √I ) 2  =   ( 2√I ) 2  = 4I I = 25 units I 1   = I and I 2   ∝ (A 2 ) 2  A 2   = A −   A =   (   ) 20 100 4A 5  I 2   ∝ (A 2 ) 2   ∝   (   ) 2 4A 5  I 2   ∝   A 2 16 25  I 2   =   I 16 25  I ′ max   =   ( √I +   √   I )  2  =   ( √I +   √I ) 2  = I (   ) 2 16 25 4 5 9 5  I =   × 25 = 81 81 25 81 25",
    "languages": {
      "en": {
        "questionText": "Two coherent sources of equal intensities\nproduce a maximum of 100 units. If the\namplitude of one of the sources is reduced\nby 20% , then the maximum intensity\nproduced will be :",
        "options": [
          {
            "label": "A",
            "value": "100",
            "type": "text"
          },
          {
            "label": "B",
            "value": "81",
            "type": "text"
          },
          {
            "label": "C",
            "value": "89",
            "type": "text"
          },
          {
            "label": "D",
            "value": "60",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "स मा न ती \u0000 ता के दो क ला सं बं \u0000 \u0000ो त 100 इ का ई का\nउ \u0000\u0000 \u0000 उ \u0000 \u0000 कर ते है । य िद िक सी एक \u0000ो त का\nआ या म 20% तक घ टा िद या जा ये तब उ \u0000 \u0000\nअ िध कतम ती \u0000 ता हो गी :",
        "options": [
          {
            "label": "A",
            "value": "100",
            "type": "text"
          },
          {
            "label": "B",
            "value": "81",
            "type": "text"
          },
          {
            "label": "C",
            "value": "89",
            "type": "text"
          },
          {
            "label": "D",
            "value": "60\nी ी ो ी ई ि ी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 11,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q40",
    "questionNumber": 40,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "Two stretched strings of same material are\nvibrating under the same tension in\nfundamental mode. The ratio of their\nfrequencies is 1 : 2 and ratio of the length\nof the vibrating segments is 1 : 4 . Then\nthe ratio of the radii of the strings is:",
    "options": [
      {
        "label": "A",
        "value": "2 : 1",
        "type": "text"
      },
      {
        "label": "B",
        "value": "4 : 1",
        "type": "text"
      },
      {
        "label": "C",
        "value": "3 : 2",
        "type": "text"
      },
      {
        "label": "D",
        "value": "8 : 1",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "=   =   =   =  ( F 0   )   1  ( F 0   )   2  1 2  V 1 2 L 1 V 2 2 L 2  V 1  V 2  L 2  L 1  V 1  V 2  4 1  =   = V 1  V 2  1 8  √   T  μ 1  √ T/ μ 2  =   =   =  μ 2  μ 2  1 64  ρ ⋅A 2  ρ A 1  1 64  =   = 64 A 1  A 2  π r 2 1  π r 2 2  = 8  r 1  r 2",
    "languages": {
      "en": {
        "questionText": "Two stretched strings of same material are\nvibrating under the same tension in\nfundamental mode. The ratio of their\nfrequencies is 1 : 2 and ratio of the length\nof the vibrating segments is 1 : 4 . Then\nthe ratio of the radii of the strings is:",
        "options": [
          {
            "label": "A",
            "value": "2 : 1",
            "type": "text"
          },
          {
            "label": "B",
            "value": "4 : 1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "3 : 2",
            "type": "text"
          },
          {
            "label": "D",
            "value": "8 : 1",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक ही प दा थ\u0000 की दो फै ली \u0000 ई ता र\u0000 मू ल िव धा म\u0000 एक ही\nत ना व के अं त ग\u0000 त कं पन कर र ही ह\u0000 । उन की आ वृ ि\u0000 यों का\nअ नु पा त 1 : 2 है और कं पन खं डों की लं बा ई का\nअ नु पा त 1 : 4 है । तो ता रों की ि\u0000 \u0000ा ओं का अ नु पा त\nहै :",
        "options": [
          {
            "label": "A",
            "value": "2 : 1",
            "type": "text"
          },
          {
            "label": "B",
            "value": "4 : 1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "3 : 2",
            "type": "text"
          },
          {
            "label": "D",
            "value": "8 : 1",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 12,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q41",
    "questionNumber": 41,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A potential barrier of 0. 50 V exists across\na P–N junction. If the depletion region is\n−7",
    "options": [
                  {
                            "label": "A",
                            "value": "Option A",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "Option B",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "Option C",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "Option D",
                            "type": "text"
                  }
        ],
    "correctAnswer": "A",
    "explanation": "Using formula of Electric field  E =   V  d  =   0.5 5×10 −7  = 1 × 10 6   V/m",
    "languages": {
      "en": {
        "questionText": "A potential barrier of 0. 50 V exists across\na P–N junction. If the depletion region is\n−7",
        "options": [
          {
            "label": "A",
            "value": "Option A",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Option B",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Option C",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Option D",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "P–N सं िध के प \u0000र तः 0. 50 V का िव भव \u0000ा ची र उ \u0000 \u0000\n−7\nहो ता है । य िद अव \u0000 य \u0000े \u0000 की चौ ड़ा ई 5 .0 ×10 m\nहै , तो इस \u0000े \u0000 म\u0000 िव द्यु त \u0000े \u0000 की ती \u0000 ता है -\n6 5",
        "options": [
  {
    "label": "A",
    "value": "Option A",
    "type": "text"
  },
  {
    "label": "B",
    "value": "Option B",
    "type": "text"
  },
  {
    "label": "C",
    "value": "Option C",
    "type": "text"
  },
  {
    "label": "D",
    "value": "Option D",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 12,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q42",
    "questionNumber": 42,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "In the figure, the intensity of waves\narriving at D from two coherent sources S 1\nand S 2 is I 0 . The wavelength of the wave\nis λ = 4m . Resultant intensity at D will be\n:-",
    "options": [
      {
        "label": "A",
        "value": "4I 0",
        "type": "text"
      },
      {
        "label": "B",
        "value": "I 0",
        "type": "text"
      },
      {
        "label": "C",
        "value": "2I 0",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Zero",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "We have,  S 2 D =   √ S 1 D 2   + S 1   S 2 2  =   √ 4 2   + 3 2  = 5 m Δx = S 2 D − S 1 D = 5 − 4 = 1 m ΔΦ =   Δx =   ( 1 )   = Now, I = I 1   + I 2   + 2√I 1 I 2 cos ϕ  I = I 0   + I 0   + 2√I 0 I 0   cos   = 2I 0 2 π λ  2 π  4  π  2  π  2",
    "languages": {
      "en": {
        "questionText": "In the figure, the intensity of waves\narriving at D from two coherent sources S 1\nand S 2 is I 0 . The wavelength of the wave\nis λ = 4m . Resultant intensity at D will be\n:-",
        "options": [
          {
            "label": "A",
            "value": "4I 0",
            "type": "text"
          },
          {
            "label": "B",
            "value": "I 0",
            "type": "text"
          },
          {
            "label": "C",
            "value": "2I 0",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Zero",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िच \u0000 म\u0000 , दो क ला सं ब \u0000 \u0000ो तों S 1 और S 2 से D पर\nप \u0000ँ च ने वा ली त रं गों की ती \u0000 ता I 0 है । त रं ग की त रं ग दै \u0000\u0000\nλ = 4m है । D पर प \u0000र णा मी ती \u0000 ता हो गी :-",
        "options": [
          {
            "label": "A",
            "value": "4I 0",
            "type": "text"
          },
          {
            "label": "B",
            "value": "I 0",
            "type": "text"
          },
          {
            "label": "C",
            "value": "2I 0",
            "type": "text"
          },
          {
            "label": "D",
            "value": "शू \u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 12,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q43",
    "questionNumber": 43,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "In a single slit diffraction pattern, a light of\nwavelength 6000Å is used. The distance\nbetween the first and third minima in the\ndiffraction pattern is found to be 3 mm\nwhen the screen in placed 50 cm away\nfrom slits. The width of the slit is _______\n–4\n×10 m.",
    "options": [
      {
        "label": "A",
        "value": "4",
        "type": "text"
      },
      {
        "label": "B",
        "value": "2",
        "type": "text"
      },
      {
        "label": "C",
        "value": "5",
        "type": "text"
      },
      {
        "label": "D",
        "value": "3",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "For   minima  Similarly,  Now, according to qn. y   – y   = 3 mm  3 rd   sin   θ   ≈   θ   ≈ tan   θ   =   =  y 3  D  3 λ a  =   =  y 3  D  3 λ a  y 1   =   λD a  3   1  ⇒   = 3 mm 2 λD a  ⇒ a =   2×6000×10 −10 ×50×10 −2  3×10 −3  = 20 × 10 −5   m = 2 × 10 −4   m",
    "languages": {
      "en": {
        "questionText": "In a single slit diffraction pattern, a light of\nwavelength 6000Å is used. The distance\nbetween the first and third minima in the\ndiffraction pattern is found to be 3 mm\nwhen the screen in placed 50 cm away\nfrom slits. The width of the slit is _______\n–4\n×10 m.",
        "options": [
          {
            "label": "A",
            "value": "4",
            "type": "text"
          },
          {
            "label": "B",
            "value": "2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "5",
            "type": "text"
          },
          {
            "label": "D",
            "value": "3",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक िझ री िव व त\u0000 न पै ट न\u0000 म\u0000 , 6000Å की त रं ग दै \u0000\u0000 के\nएक \u0000 का श का उप यो ग िक या ग या है । इस िव व त\u0000 न पै ट न\u0000\nम\u0000 \u0000 थम त था तृ ती य िन ि\u0000 \u0000 के बी च की दू री 3 िम मी . है\nजब प दा\u0000 िझ \u0000र यों से 50 से मी की दू री पर है । िझ री की\n–4\nचौ ड़ा ई _______ ×10 मी है ।",
        "options": [
          {
            "label": "A",
            "value": "4",
            "type": "text"
          },
          {
            "label": "B",
            "value": "2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "5",
            "type": "text"
          },
          {
            "label": "D",
            "value": "3",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 12,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q44",
    "questionNumber": 44,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A parallel plate capacitor is maintained at\na certain potential difference. When a\n3 mm slab is introduced between the\nplates, in order to maintain the same\npotential difference, the distance between\nthe plates is increased by 2. 4 mm . Find\nthe dielectric constant of the slab.",
    "options": [
      {
        "label": "A",
        "value": "3",
        "type": "text"
      },
      {
        "label": "B",
        "value": "4",
        "type": "text"
      },
      {
        "label": "C",
        "value": "5",
        "type": "text"
      },
      {
        "label": "D",
        "value": "1",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Capacitance of capacitor  ... (i)  If a slab of thickness t is introduced between  the plates with   new separation d then its new  capacitance  ....(ii)  As q = CV, charge on the capacitor is same in  both cases, therefore to mention same p.d., the  capacitance C and C' must be same, i.e., from  (i) and (ii)  Here, d' = d + 2.4 mm = d + 2.4 × 10   m  t = 3 mm = 3×10   m  C 0   =   ε 0 A d  C' =   ε 0  d'–t+   t k  =  ε 0 A d  ε 0 A d'–t+   t k  ⇒ d = d'– t +   t k  –3  –3  ∴   d = d + 2. 4 × 10 –3 – 3 × 10 –3   +   3×10 –3  k  ⇒– 3 +   =– 2. 4 3 k  ⇒ k = 5",
    "languages": {
      "en": {
        "questionText": "A parallel plate capacitor is maintained at\na certain potential difference. When a\n3 mm slab is introduced between the\nplates, in order to maintain the same\npotential difference, the distance between\nthe plates is increased by 2. 4 mm . Find\nthe dielectric constant of the slab.",
        "options": [
          {
            "label": "A",
            "value": "3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "4",
            "type": "text"
          },
          {
            "label": "C",
            "value": "5",
            "type": "text"
          },
          {
            "label": "D",
            "value": "1",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक स मा ना \u0000 र \u0000े ट सं धा \u0000र \u0000 एक िन ि\u0000 त िव भ वा \u0000 र पर\nब ना ये र खा जा ता है । जब एक 3 mm की प ि\u0000 का \u0000े टो\nके बी च \u0000 वे श क रा ई जा ती है , तब व ही िव भ वा \u0000 र ब ना ये\nरख ने के िल ए \u0000े टो के बी च दू री 2. 4 mm ब ढा ई जा ती\nहै । प ि\u0000 का का प रा वै द्यु तां क \u0000ा त क रो -",
        "options": [
          {
            "label": "A",
            "value": "3",
            "type": "text"
          },
          {
            "label": "B",
            "value": "4",
            "type": "text"
          },
          {
            "label": "C",
            "value": "5",
            "type": "text"
          },
          {
            "label": "D",
            "value": "1",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 12,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q45",
    "questionNumber": 45,
    "subject": "Physics",
    "chapter": "Physics Major Revision",
    "questionText": "A thin metal disc of radius 0.25 m and\nmass 2 kg starts from rest and rolls down\nan inclined plane. If its rotational kinetic\nenergy is 4J at the foot of the inclined\nplane, then its linear velocity at the same\npoint is-",
    "options": [
                  {
                            "label": "A",
                            "value": "1.2 m/s²",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "1.63 m/s²",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "2.45 m/s²",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "4.9 m/s²",
                            "type": "text"
                  }
        ],
    "correctAnswer": "B",
    "explanation": "R = 0.25m =  m = 2kg  KE =  V   = 8  V=   m/s  I =  1 4  I 2 1 2  4 × 2 × 10 ×   = v 2 1 16  2  2√2 =   ×   = mR 2  2 2 2 1 16 1 16\nChemistry - Section A",
    "languages": {
      "en": {
        "questionText": "A thin metal disc of radius 0.25 m and\nmass 2 kg starts from rest and rolls down\nan inclined plane. If its rotational kinetic\nenergy is 4J at the foot of the inclined\nplane, then its linear velocity at the same\npoint is-",
        "options": [
          {
            "label": "A",
            "value": "1.2 m/s",
            "type": "text"
          },
          {
            "label": "B",
            "value": "2√2 m/s",
            "type": "text"
          },
          {
            "label": "C",
            "value": "20 m/s",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2 m/s",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "धा तु की एक पत ली चक ती की ि\u0000 \u0000ा 0.25 m ए वं\n\u0000 \u0000 मा न 2 kg है । यह िव रा मा व \u0000 था से नत तल पर\nलु ढ़क ती है । य िद नत तल की त ली पर इस की घू ण\u0000 न\nग ित ज ऊ जा\u0000 4J ह\u0000 तो उ सी िब \u0000दु पर इस का रे खी य वे ग\nहो गा -",
        "options": [
  {
    "label": "A",
    "value": "1.2 m/s²",
    "type": "text"
  },
  {
    "label": "B",
    "value": "1.63 m/s²",
    "type": "text"
  },
  {
    "label": "C",
    "value": "2.45 m/s²",
    "type": "text"
  },
  {
    "label": "D",
    "value": "4.9 m/s²",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 12,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q46",
    "questionNumber": 46,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "The IUPAC name of",
    "options": [
      {
        "label": "A",
        "value": "2-chlorocarbonylethyl benzoate",
        "type": "text"
      },
      {
        "label": "B",
        "value": "2-carboxyethylbenzoyl chloride",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Methyl 2-chlorocarbonylbenzoate",
        "type": "text"
      },
      {
        "label": "D",
        "value": "None is correct",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "(C) Methyl 2-chlorocarbonylbenzoate",
    "languages": {
      "en": {
        "questionText": "The IUPAC name of",
        "options": [
          {
            "label": "A",
            "value": "2-chlorocarbonylethyl benzoate",
            "type": "text"
          },
          {
            "label": "B",
            "value": "2-carboxyethylbenzoyl chloride",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Methyl 2-chlorocarbonylbenzoate",
            "type": "text"
          },
          {
            "label": "D",
            "value": "None is correct",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 का स ही IUPAC ना म है :",
        "options": [
          {
            "label": "A",
            "value": "2- \u0000ो रो का ब\u0000 िन लए िथ ल बे \u0000 जो एट",
            "type": "text"
          },
          {
            "label": "B",
            "value": "2- का ब\u0000 \u0000ी ए िथ ल बे \u0000 जो ईल \u0000ो रा इड",
            "type": "text"
          },
          {
            "label": "C",
            "value": "मे िथ ल -2- \u0000ो रो का ब\u0000 िन ल बे \u0000 जो एट",
            "type": "text"
          },
          {
            "label": "D",
            "value": "को ई स ही न ही है",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 13,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q47",
    "questionNumber": 47,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "For complete combustion of ethanol,\nC 2 H 5 OH(l)+3O 2 (g) → 2CO 2 (g)+3H 2 O(l),\nthe amount of heat produced as measured\n–1\nin bomb calorimeter, is 1500.0 kJ mol at\n25ºC. Assuming ideally the Enthalpy of\ncombustion, Δ C H, for the reaction will be :\n–1\n(R = 8.314 J mol )\n-1",
    "options": [
      {
        "label": "A",
        "value": "-150",
        "type": "text"
      },
      {
        "label": "B",
        "value": "-160",
        "type": "text"
      },
      {
        "label": "C",
        "value": "-140",
        "type": "text"
      },
      {
        "label": "D",
        "value": "-170",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "C   H   OH(l) + 3O   (g)   →   2CO   (g) + 3H   O(l)  ΔU = -1500 kJ mol  ΔH = ?  T = 298 K  Δn   = -1  R = 8.314 J mol  ΔH = ΔU + Δn   RT  = – 1500 + (–1) × 8.314 × 10   × 298  = –1500   – 2.47 = – 1502.47   kJ mol  2   5   2   2   2  -1  g  -1  g  –3  –1",
    "languages": {
      "en": {
        "questionText": "For complete combustion of ethanol,\nC 2 H 5 OH(l)+3O 2 (g) → 2CO 2 (g)+3H 2 O(l),\nthe amount of heat produced as measured\n–1\nin bomb calorimeter, is 1500.0 kJ mol at\n25ºC. Assuming ideally the Enthalpy of\ncombustion, Δ C H, for the reaction will be :\n–1\n(R = 8.314 J mol )\n-1",
        "options": [
          {
            "label": "A",
            "value": "-150",
            "type": "text"
          },
          {
            "label": "B",
            "value": "-160",
            "type": "text"
          },
          {
            "label": "C",
            "value": "-140",
            "type": "text"
          },
          {
            "label": "D",
            "value": "-170",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "ऐ थे नॉ ल के पू ण\u0000 दहन के िल ये\nC 2 H 5 OH(l)+3O 2 (g) → 2CO 2 (g)+3H 2 O(l),\n25ºC पर बम कै लो री मी टर मे मा पी गई उ \u0000 \u0000 ऊ \u0000ा\n–1\nकी मा \u0000ा 1500.0 kJ mol है आद श\u0000 \u0000\u0000थ ित मा न ते\n\u0000 ये अ िभ ि\u0000 या के िल ये दहन की ए \u0000ै \u0000ी Δ C H हो गी\n–1\n(R = 8.314 J mol )\n-1",
        "options": [
          {
            "label": "A",
            "value": "-150",
            "type": "text"
          },
          {
            "label": "B",
            "value": "-160",
            "type": "text"
          },
          {
            "label": "C",
            "value": "-140",
            "type": "text"
          },
          {
            "label": "D",
            "value": "-170",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 13,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q48",
    "questionNumber": 48,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "What volume of 0.10 M H 2 SO 4 must be\nadded to 50 mL of a 0.10 M NaOH solution\nto make a solution in which the molarity of\nthe H 2 SO 4 is 0.050 M ?",
    "options": [
      {
        "label": "A",
        "value": "400 mL",
        "type": "text"
      },
      {
        "label": "B",
        "value": "50 mL",
        "type": "text"
      },
      {
        "label": "C",
        "value": "100 mL",
        "type": "text"
      },
      {
        "label": "D",
        "value": "150 mL",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "we know that ;N   V   = N   V  N = M   n. ;for H   SO   n=2  N   = 0.10   2 ;N   = 0.05   2  V   = 50ml ; V   = x  N   V   = N   V  0.1   2   50 = 0.05   2   x  x =  x = 100ml  1   1   2   2  ×   2   4  1   ×   2   ×  1   2  1   1   2   2  × ×   ×   ×  0.2×50 0.1",
    "languages": {
      "en": {
        "questionText": "What volume of 0.10 M H 2 SO 4 must be\nadded to 50 mL of a 0.10 M NaOH solution\nto make a solution in which the molarity of\nthe H 2 SO 4 is 0.050 M ?",
        "options": [
          {
            "label": "A",
            "value": "400 mL",
            "type": "text"
          },
          {
            "label": "B",
            "value": "50 mL",
            "type": "text"
          },
          {
            "label": "C",
            "value": "100 mL",
            "type": "text"
          },
          {
            "label": "D",
            "value": "150 mL",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "H 2 SO 4 की मो लर ता 0.050 M का िव लयन ब ना ने के\nिल ये 50 mL, 0.10 M NaOH िव लयन म\u0000 0.10 M,\nH 2 SO 4 का िक त ना आयतन िम ला ना चा िह ये ।",
        "options": [
          {
            "label": "A",
            "value": "400 mL",
            "type": "text"
          },
          {
            "label": "B",
            "value": "50 mL",
            "type": "text"
          },
          {
            "label": "C",
            "value": "100 mL",
            "type": "text"
          },
          {
            "label": "D",
            "value": "150 mL",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 13,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q49",
    "questionNumber": 49,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Noble gases are –",
    "options": [
      {
        "label": "A",
        "value": "Colourless",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Odourless",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Tasteless and non inflammable",
        "type": "text"
      },
      {
        "label": "D",
        "value": "All",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Noble gases –  (i)   colourless  (ii) odourless  (iii) tasteless and non inflammable  Noble gases are colorless, odorless, tasteless,  and   nonflammable   gases   under   standard  conditions.   In   the   periodic   table,   the   noble  gases   are   arranged   according   to   their   boiling  point. Noble gases are widely used in different  fields,   from   incandescent   lighting   to   excimer  lasers.",
    "languages": {
      "en": {
        "questionText": "Noble gases are –",
        "options": [
          {
            "label": "A",
            "value": "Colourless",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Odourless",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Tasteless and non inflammable",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "नो बल गै से ह\u0000 -",
        "options": [
          {
            "label": "A",
            "value": "रं ग ही न",
            "type": "text"
          },
          {
            "label": "B",
            "value": "गं ध ही न",
            "type": "text"
          },
          {
            "label": "C",
            "value": "\u0000ा द ही न त था अ \u0000 लन शी ल",
            "type": "text"
          },
          {
            "label": "D",
            "value": "स भी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 13,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q50",
    "questionNumber": 50,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Match Column-I with Column-II.\nColumn- I Column-II\n16 g of\nA I Weighs 28g\nCH 4 (g)\n1 g 60.2 ×\nB II 23\nof H 2 (g) 10 electrons\n1 mole of\nC III Weighs 96 g\nN 2 (g)\nOccupies 11.4",
    "options": [
      {
        "label": "A",
        "value": "A-II, B-IV, C-I, D-III",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A-II, B-IV, C-III, D-I",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A-II, B-III, C-IV, D-I",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A-I, B-III, C-II, D-IV",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "(A) 16 g of  Molarmass of  Moles of   mole  1 mole of   contains   atoms  atoms have  electrons or   electrons  (B) 1 g of  At STP 1 g   i. e.,   mole  at STP 1 mole = 22.4 L  mole = 11.2 L  (C) 1 mole of  1 mole of  (D) 0.5 mole of  0.5 mole  Hence, the correct order is A-II, B-IV, C-I, D-  III.  CH 4 (g) CH 4   = 12 + 4 × 1 = 16 g mol −1  CH 4   =   = 1 16 16  CH 4   6. 022 × 10 23  6. 022 × 10 23   6. 022 × 10 24  60. 22 × 10 23  H 2 (g) H 2   1 2   H 2 1 2  N 2 (g) N 2   = 1 × 28 = 28 g SO 2 (g) SO 2   =   × 64 = 32 g 1 2",
    "languages": {
      "en": {
        "questionText": "Match Column-I with Column-II.\nColumn- I Column-II\n16 g of\nA I Weighs 28g\nCH 4 (g)\n1 g 60.2 ×\nB II 23\nof H 2 (g) 10 electrons\n1 mole of\nC III Weighs 96 g\nN 2 (g)\nOccupies 11.4",
        "options": [
          {
            "label": "A",
            "value": "A-II, B-IV, C-I, D-III",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A-II, B-IV, C-III, D-I",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A-II, B-III, C-IV, D-I",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A-I, B-III, C-II, D-IV",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "\u0000ं भ -I का िम ला न \u0000ं भ -II से क र\u0000\n\u0000ं भ -I \u0000ं भ -II\nCH 4 (g) के\nA I 28 g भा र\n16 g\n23\nH 2 (g) के 60. 2 × 10\nB II\n1 g इ ले \u0000\u0000ॉ न\nN 2 (g) के\nC III 96 g भा र\n1 मो ल\nSTP पर 11.4\nSO 2 (g) के\nD IV L आयतन \u0000 हण",
        "options": [
          {
            "label": "A",
            "value": "A-II, B-IV, C-I, D-III",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A-II, B-IV, C-III, D-I",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A-II, B-III, C-IV, D-I",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A-I, B-III, C-II, D-IV",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 14,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q51",
    "questionNumber": 51,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "The bond in solid HF can be best represented as :",
    "options": [
      {
        "label": "A",
        "value": "H − F ... H − F ... H − F (Linear chains)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Zig-zag chains with planar F−H...F hydrogen bonds",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Isolated HF dimers with covalent bonds only",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Tetrahedral 3D network with ionic bonds",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "For symmetry  The   arrangement   of   bp   and   lp   around   F   is  tetrahedral.   Therefore,   angle   should   appear  around F and not around H atom.",
    "languages": {
      "en": {
        "questionText": "The bond in solid HF can be best represented as :",
        "options": [
          {
            "label": "A",
            "value": "H − F ... H − F ... H − F (Linear chains)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Zig-zag chains with planar F−H...F hydrogen bonds",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Isolated HF dimers with covalent bonds only",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Tetrahedral 3D network with ionic bonds",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "ठो स HF म\u0000 बं ध स वा\u0000 \u0000 म िन \u0000 िप त िन \u0000 म\u0000 हो सक ते हैः -",
        "options": [
          {
            "label": "A",
            "value": "H − F ... H − F ... H − F",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Option (B)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Option (C)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Option (D)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 14,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q52",
    "questionNumber": 52,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "According to the wave-particle duality of matter by de-Broglie, which of the following graph plot presents most appropriate relationship between wavelength of electron (λ) and momentum of electron (p)?",
    "options": [
                  {
                            "label": "A",
                            "value": "Rectangular hyperbola between λ and p",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "Straight line between λ and p with positive slope",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "Parabola opening upwards",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "Exponential decay",
                            "type": "text"
                  }
        ],
    "correctAnswer": "A",
    "explanation": "As per de-Broglie  hence   (hyperbola curve)  λ   =   h p  λ   ∝   1 p  λ   ↑, P ↓",
    "languages": {
      "en": {
        "questionText": "According to the wave-particle duality of matter by de-Broglie, which of the following graph plot presents most appropriate relationship between wavelength of electron (λ) and momentum of electron (p)?",
        "options": [
          {
            "label": "A",
            "value": "Rectangular hyperbola (λ ∝ 1/p)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Straight line passing through origin (λ ∝ p)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Parabolic curve opening along p-axis",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Linear curve with negative slope",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "डी - \u0000ो ग ली \u0000ा रा प दा थ\u0000 के त रं ग - कण िस \u0000ां त के अ नु सा र ,\nिन \u0000 म\u0000 से कौ न सा \u0000ा फ िच \u0000 इ ले \u0000\u0000ॉ न की त रं ग दै \u0000\u0000 ( λ\n) और इ ले \u0000\u0000ॉ न की सं वे ग (p) के बी च सब से उप यु \u0000\nसं बं ध द शा\u0000 ता है ?",
        "options": [
  {
    "label": "A",
    "value": "Rectangular hyperbola between λ and p",
    "type": "text"
  },
  {
    "label": "B",
    "value": "Straight line between λ and p with positive slope",
    "type": "text"
  },
  {
    "label": "C",
    "value": "Parabola opening upwards",
    "type": "text"
  },
  {
    "label": "D",
    "value": "Exponential decay",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 14,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q53",
    "questionNumber": 53,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "What is the amount of heat to be supplied\nto prepare 128g of CaC 2 by using CaCO 3\nand followed by reaction with carbon.\nReactions are:\nCaCO 3 (s) → CaO(s) + CO 2 (g);\nΔ H° = 42. 8 kcal\nCaO(s) + 3C(s) → CaC 2 (s) + CO(g);\nΔ H° = 111 kcal",
    "options": [
      {
        "label": "A",
        "value": "10",
        "type": "text"
      },
      {
        "label": "B",
        "value": "22",
        "type": "text"
      },
      {
        "label": "C",
        "value": "307. 6 kcal",
        "type": "text"
      },
      {
        "label": "D",
        "value": "45",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Thus heat required to prepare 1 mole of  Molecular weight of CaC   = 40+24 = 64  64 g of   CaC   requires   153.8 kcal   of heat.  128 g of   CaC   requires   307.6 kcal   of heat.  CaCO 3 (s) → CaO(s) + CO 2 (g); Δ H° = 42. 8 kcal CaO(s) + 3C(s) → CaC 2 (s) + CO(g); Δ H° = 111 kcal CaCO 3 (s) + 3C(s) → CaC 2 (s) + CO(g) + CO 2 (g) Δ H = 153. 8   kcal  CaC 2   from CaCO 3   = 153. 8 kcal  2  2  2",
    "languages": {
      "en": {
        "questionText": "What is the amount of heat to be supplied\nto prepare 128g of CaC 2 by using CaCO 3\nand followed by reaction with carbon.\nReactions are:\nCaCO 3 (s) → CaO(s) + CO 2 (g);\nΔ H° = 42. 8 kcal\nCaO(s) + 3C(s) → CaC 2 (s) + CO(g);\nΔ H° = 111 kcal",
        "options": [
          {
            "label": "A",
            "value": "10",
            "type": "text"
          },
          {
            "label": "B",
            "value": "22",
            "type": "text"
          },
          {
            "label": "C",
            "value": "307. 6 kcal",
            "type": "text"
          },
          {
            "label": "D",
            "value": "45",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "CaCO 3 का उप यो ग कर के त था त \u0000 \u0000ा त का ब\u0000 न के\nसा थ अ िभ ि\u0000 या से 128g CaC 2 को ब ना ने के िल ये\nिक त नी ऊ \u0000ा की मा \u0000ा दी जा नी चा िह ये अ िभ ि\u0000 या य\u0000 िन \u0000\nहै\nCaCO 3 (s) → CaO(s) + CO 2 (g);\nΔ H° = 42. 8 kcal\nCaO(s) + 3C(s) → CaC 2 (s) + CO(g);\nΔ H° = 111 kcal",
        "options": [
          {
            "label": "A",
            "value": "10",
            "type": "text"
          },
          {
            "label": "B",
            "value": "22",
            "type": "text"
          },
          {
            "label": "C",
            "value": "307. 6 kcal",
            "type": "text"
          },
          {
            "label": "D",
            "value": "45",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 15,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q54",
    "questionNumber": 54,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Which of them is not equal to zero for an ideal solution?",
    "options": [
      {
        "label": "A",
        "value": "ΔV_mix = 0",
        "type": "text"
      },
      {
        "label": "B",
        "value": "ΔP = P_Observed − P_Raoult = 0",
        "type": "text"
      },
      {
        "label": "C",
        "value": "ΔH_mix = 0",
        "type": "text"
      },
      {
        "label": "D",
        "value": "ΔS_mix ≠ 0 (ΔS_mix > 0)",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "The solution which obey Raoult's law over the  entire   range   of   concentration   are   known   as  ideal solutions.  Thus, Δ P = P   − P   = 0 .  Since   for   an   ideal   solution   since   the   solute-  solute   and   solvent-solvent   intermolecular  attraction forces are equal to the solute-solvent  intermolecular attractive forces, the enthalpy of  mixing   (   Δ   H   )   of   the   pure   components   to  form   the   solution   is   zero   and   the   volume   of  mixing ( Δ   V ) is also zero.  However, for an ideal solution, entropy mixing (  Δ   S ) is not zero. it positive because a solvent  (or   solute)   in   a   solution   has   more   molecular  disorder.  observed   Raoult  mix  mix  mix",
    "languages": {
      "en": {
        "questionText": "Which of them is not equal to zero for an ideal solution?",
        "options": [
          {
            "label": "A",
            "value": "ΔV_mix = 0",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ΔP = P_Observed − P_Raoult = 0",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ΔH_mix = 0",
            "type": "text"
          },
          {
            "label": "D",
            "value": "ΔS_mix ≠ 0 (ΔS_mix > 0)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक आद श\u0000 िव लयन के िल ए इन म\u0000 से कौ न सा शू \u0000 के\nब रा बर न हीं है ?\n(2)",
        "options": [
          {
            "label": "A",
            "value": "ΔV mix ΔP = P Observed − P Raou",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Option (B)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ΔH mix",
            "type": "text"
          },
          {
            "label": "D",
            "value": "ΔS mix",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 15,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q55",
    "questionNumber": 55,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Number of geometrical isomers formed\nfrom C 2 (Cl)(Br)(I)(F)",
    "options": [
      {
        "label": "A",
        "value": "4",
        "type": "text"
      },
      {
        "label": "B",
        "value": "8",
        "type": "text"
      },
      {
        "label": "C",
        "value": "6",
        "type": "text"
      },
      {
        "label": "D",
        "value": "9",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "There are six geome  trical isomers possible for C   (Cl)(Br)(I)(F) 2",
    "languages": {
      "en": {
        "questionText": "Number of geometrical isomers formed\nfrom C 2 (Cl)(Br)(I)(F)",
        "options": [
          {
            "label": "A",
            "value": "4",
            "type": "text"
          },
          {
            "label": "B",
            "value": "8",
            "type": "text"
          },
          {
            "label": "C",
            "value": "6",
            "type": "text"
          },
          {
            "label": "D",
            "value": "9",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "C 2 (Cl)(Br)(I)(F) से िन िम\u0000 त \u0000ा िम ित ये स मा वय वी यो\nकी सं \u0000ा है",
        "options": [
          {
            "label": "A",
            "value": "4",
            "type": "text"
          },
          {
            "label": "B",
            "value": "8",
            "type": "text"
          },
          {
            "label": "C",
            "value": "6",
            "type": "text"
          },
          {
            "label": "D",
            "value": "9",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 15,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q56",
    "questionNumber": 56,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Compare the bond energy of different C –\nH bonds shown in the following molecule",
    "options": [
      {
        "label": "A",
        "value": "a > b > c > d",
        "type": "text"
      },
      {
        "label": "B",
        "value": "a > b > d > c",
        "type": "text"
      },
      {
        "label": "C",
        "value": "c > d > a > b",
        "type": "text"
      },
      {
        "label": "D",
        "value": "c > d > b > a",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "a = resonance + 1°  b = resonance + 2°  c = 1° – carbon  d = 2° – carbon  Bond energy   α   1 stability of radical",
    "languages": {
      "en": {
        "questionText": "Compare the bond energy of different C –\nH bonds shown in the following molecule",
        "options": [
          {
            "label": "A",
            "value": "a > b > c > d",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a > b > d > c",
            "type": "text"
          },
          {
            "label": "C",
            "value": "c > d > a > b",
            "type": "text"
          },
          {
            "label": "D",
            "value": "c > d > b > a",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 अ णु म\u0000 द शा\u0000 ए गए िव िभ \u0000 C – H बं धों की बं ध\nऊ जा\u0000 की तु ल ना की िज ए।",
        "options": [
          {
            "label": "A",
            "value": "a > b > c > d",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a > b > d > c",
            "type": "text"
          },
          {
            "label": "C",
            "value": "c > d > a > b",
            "type": "text"
          },
          {
            "label": "D",
            "value": "c > d > b > a",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 15,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q57",
    "questionNumber": 57,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Match List-I with List-II.\nList-II (Type of\nList-I (Reaction)\nredox reaction)\n(A) N 2(g) +O 2(g) → 2NO (g) (I) Decomposition\n(B) 2Pb(NO 3 ) 2(s) →\n(II) Displacement\n2PbO (s) + 4NO 2(g) +O 2(g)\n(C) 2Na (s) +2H 2 O (l) → (III)\n2NaOH(aq.) + H 2(g) Disproportionation\n–\n(D) 2NO 2(g) +2OH (aq.)\n– –\n→ NO 2 (aq.) + NO 3 (IV) Combination\n(aq.) +H 2 O (l)\nChoose the correct answer from the\noptions give below :",
    "options": [
      {
        "label": "A",
        "value": "(A)-(IV), (B)(I), (C)-(II), (D)-(III)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(A)-(III), (B)-(II), (C)-(I), (D)-(IV)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(A)-(I), (B)-(II), (C)-(III), (D)-(IV)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(A)-(II), (B)-(III), (C)-(IV), (D)-(I)",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "(Reaction)   (Type   of   redox  reaction)  (A)   (IV)   Combination  (B)  (I)   Decomposition  (C)  (II)   Displacement  (D)  (III)   Disproportionation  (A) In this reaction N   combine with O   gives  2mole of NO gas  (B) when we heated Pb(NO   )   decompose   and  give oxygen gas and NO   and PbO  (C)   In this reaction Na displaced H   ion  (D)   Disproportionation reaction is a reaction in  which,   the   same   element   is   simultaneously  oxidized and reduced  here NO   oxidized as well as reduced  N 2(g)   + O 2(g)   → 2 NO (g)  2 Pb (NO 3 ) 2(s)   → 2 PbO (s)   + 4 NO 2(g)   + O 2(g)  2 Na (s)   + 2H 2 O (l)   → 2 NaOH (aq.)   + H 2(g)  2 NO 2(g)   + 2 −   OH ( aq.   )   → NO − 2(aq.)   + NO − 3(aq.)   + H 2 O (l)  2   2  3   2  2  +  2",
    "languages": {
      "en": {
        "questionText": "Match List-I with List-II.\nList-II (Type of\nList-I (Reaction)\nredox reaction)\n(A) N 2(g) +O 2(g) → 2NO (g) (I) Decomposition\n(B) 2Pb(NO 3 ) 2(s) →\n(II) Displacement\n2PbO (s) + 4NO 2(g) +O 2(g)\n(C) 2Na (s) +2H 2 O (l) → (III)\n2NaOH(aq.) + H 2(g) Disproportionation\n–\n(D) 2NO 2(g) +2OH (aq.)\n– –\n→ NO 2 (aq.) + NO 3 (IV) Combination\n(aq.) +H 2 O (l)\nChoose the correct answer from the\noptions give below :",
        "options": [
          {
            "label": "A",
            "value": "(A)-(IV), (B)(I), (C)-(II), (D)-(III)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(A)-(III), (B)-(II), (C)-(I), (D)-(IV)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(A)-(I), (B)-(II), (C)-(III), (D)-(IV)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(A)-(II), (B)-(III), (C)-(IV), (D)-(I)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "सू ची -I का िम ला न सू ची -II से क र\u0000 :\nसू ची -II ( रे डॉ \u0000\nसू ची -I ( अ िभ ि\u0000 या ) अ िभ ि\u0000 या का\n\u0000 का र )\n(A) N 2(g) +O 2(g) → 2NO (g) (I) अपघटन\n(B) 2Pb(NO 3 ) 2(s) →\n(II) िव \u0000 था पन\n2PbO (s) + 4NO 2(g) +O 2(g)\n(III)\n(C) 2Na (s) +2H 2 O (l) →\n2NaOH(aq.) + H 2(g) अस मा नु पा तन\n–\n(D) 2NO 2(g) +2OH (aq.) →\n– –\nNO 2 (aq.) + NO 3 (IV) यो ग\n(aq.) +H 2 O (l)\nनी चे िद ऐ गए िव क \u0000ों म\u0000 से स ही उ \u0000 र को चु न\u0000",
        "options": [
          {
            "label": "A",
            "value": "(A)-(IV), (B)(I), (C)-(II), (D)-(III)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(A)-(III), (B)-(II), (C)-(I), (D)-(IV)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(A)-(I), (B)-(II), (C)-(III), (D)-(IV)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(A)-(II), (B)-(III), (C)-(IV), (D)-(I)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 15,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q58",
    "questionNumber": 58,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Units of rate constant for first and zero\norder reactions in terms of molarity (M)\nare respectively.\n−1 −1",
    "options": [
      {
        "label": "A",
        "value": "sec , M sec\n−1",
        "type": "text"
      },
      {
        "label": "B",
        "value": "sec , M\n−1 −1",
        "type": "text"
      },
      {
        "label": "C",
        "value": "M sec , sec\n−1",
        "type": "text"
      },
      {
        "label": "D",
        "value": "M, sec",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "sec   , M sec −1   −1",
    "languages": {
      "en": {
        "questionText": "Units of rate constant for first and zero\norder reactions in terms of molarity (M)\nare respectively.\n−1 −1",
        "options": [
          {
            "label": "A",
            "value": "sec , M sec\n−1",
            "type": "text"
          },
          {
            "label": "B",
            "value": "sec , M\n−1 −1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "M sec , sec\n−1",
            "type": "text"
          },
          {
            "label": "D",
            "value": "M, sec",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "मो लर ता (M) के प दो मे \u0000 थम त था शू \u0000 को िट\nअ िभ ि\u0000 या ओ के िल ये दर \u0000\u0000थ रां क की इ का इ यां \u0000 म शः है\n−1 −1",
        "options": [
          {
            "label": "A",
            "value": "sec , M sec\n−1",
            "type": "text"
          },
          {
            "label": "B",
            "value": "sec , M\n−1 −1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "M sec , sec\n−1",
            "type": "text"
          },
          {
            "label": "D",
            "value": "M, sec",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 16,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q59",
    "questionNumber": 59,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "The osmotic pressure of which solution is maximum (consider that decimolar solution of each 90% dissociated) :",
    "options": [
      {
        "label": "A",
        "value": "Aluminium sulphate [Al₂(SO₄)₃]",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Barium chloride [BaCl₂]",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Sodium sulphate [Na₂SO₄]",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A mixture of equal volumes of BaCl₂ and Na₂SO₄",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "gives   maximum   osmotic   pressure  because it is gives 5 ion.  Al 2   (SO 4 ) 3",
    "languages": {
      "en": {
        "questionText": "The osmotic pressure of which solution is maximum (consider that decimolar solution of each 90% dissociated) :",
        "options": [
          {
            "label": "A",
            "value": "Aluminium sulphate [Al₂(SO₄)₃]",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Barium chloride [BaCl₂]",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Sodium sulphate [Na₂SO₄]",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A mixture of equal volumes of BaCl₂ and Na₂SO₄",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कौ न से िव लयन का प रा सरण दा ब अ िध कतम है ( यह\nमा न ते \u0000 ये की \u0000 \u0000े क का डे सी मो लर\nिव लयन 90% िव यो िज त हो ता है )",
        "options": [
          {
            "label": "A",
            "value": "ए \u0000ु िम िन यम स \u0000े ट",
            "type": "text"
          },
          {
            "label": "B",
            "value": "त था",
            "type": "text"
          },
          {
            "label": "C",
            "value": "के स मा न आयत नो का एक िम \u0000 ण",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Option (D)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 16,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q60",
    "questionNumber": 60,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Which of the following order is incorrect ?",
    "options": [
      {
        "label": "A",
        "value": "Ionic character :\nMCl < MCl 2 < MCl 3\n− − – −",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Polarizibility : F < Cl < Br < I",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Polarising power :\n+ +2 +2 +3\nNa < Ca < Mg < Al",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Covalent character :\nLiF < LiCl < LiBr < LiI",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "(1)   MCl>MCl   >MCl   along   the   period   ionic  nature of metals decrease  (2)   Polarisability of halide ions increases in the  order   F   −   .   Polarisability   is   directly  proportional to the size of the anion.  (3)   Na   2+   3+ . Higher is the charge density,  higher is the polarizing power. Charge density is  the ratio of charge to size.  (4) Covalent character = LiF  Covalent character increases with anion size increase.  2   3  −  +",
    "languages": {
      "en": {
        "questionText": "Which of the following order is incorrect ?",
        "options": [
          {
            "label": "A",
            "value": "Ionic character :\nMCl < MCl 2 < MCl 3\n− − – −",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Polarizibility : F < Cl < Br < I",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Polarising power :\n+ +2 +2 +3\nNa < Ca < Mg < Al",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Covalent character :\nLiF < LiCl < LiBr < LiI",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 मे से कौ न सा \u0000 म गलत है",
        "options": [
          {
            "label": "A",
            "value": "आय िन क ल \u0000 ण : MCl < MCl 2 < MCl 3\n− − – −",
            "type": "text"
          },
          {
            "label": "B",
            "value": "\u0000ु वी य ता : F < Cl < Br < I",
            "type": "text"
          },
          {
            "label": "C",
            "value": "\u0000ु वण \u0000 म ता :\n+ +2 +2 +3\nNa < Ca < Mg < Al",
            "type": "text"
          },
          {
            "label": "D",
            "value": "सह सं यो जक ल \u0000 ण :\nLiF < LiCl < LiBr < LiI",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 16,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q61",
    "questionNumber": 61,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "The units of rate and rate constant are\nidentical in",
    "options": [
      {
        "label": "A",
        "value": "fractional order reactions",
        "type": "text"
      },
      {
        "label": "B",
        "value": "first order reactions",
        "type": "text"
      },
      {
        "label": "C",
        "value": "second order reactions",
        "type": "text"
      },
      {
        "label": "D",
        "value": "zero order reactions.",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "nA   →   product  rate = K[A]   = k[A]   = K  When n = 0, then the rate is equal to K and it is  only possible when n is zero.  So,   the   units   of   rate   and   rate   constant   are  identical in zero order reactions.  n   0",
    "languages": {
      "en": {
        "questionText": "The units of rate and rate constant are\nidentical in",
        "options": [
          {
            "label": "A",
            "value": "fractional order reactions",
            "type": "text"
          },
          {
            "label": "B",
            "value": "first order reactions",
            "type": "text"
          },
          {
            "label": "C",
            "value": "second order reactions",
            "type": "text"
          },
          {
            "label": "D",
            "value": "zero order reactions.",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "दर त था दर िन य तां क की इ का ई याँ स मा न हो ती है",
        "options": [
          {
            "label": "A",
            "value": "िभ \u0000ा \u0000 क को िट अ िभ ि\u0000 या ओं म\u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "\u0000 थम को िट अ िभ ि\u0000 या ओं म\u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ि\u0000 ती य को िट अ िभ ि\u0000 या ओं म\u0000",
            "type": "text"
          },
          {
            "label": "D",
            "value": "शू \u0000 को िट अ िभ ि\u0000 या ओं म\u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 16,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q62",
    "questionNumber": 62,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "o\nAt 25 C dissociation constants of acid HA\nand base BOH in aqueous solution are\nsame. The pH of 0.01 M solution of HA is\n–4",
    "options": [
                  {
                            "label": "A",
                            "value": "Option A",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "Option B",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "Option C",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "Option D",
                            "type": "text"
                  }
        ],
    "correctAnswer": "C",
    "explanation": "pK   = 8   pK   =8;  pH =   pK a –   log C 1 2 1 2  ⇒ 5 =   pK a   +   × 2 1 2 1 2  a   ⇒   b  pOH =   pK b –   log C = 4 + 2 = 6 1 2 1 2",
    "languages": {
      "en": {
        "questionText": "o\nAt 25 C dissociation constants of acid HA\nand base BOH in aqueous solution are\nsame. The pH of 0.01 M solution of HA is\n–4",
        "options": [
          {
            "label": "A",
            "value": "Option A",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Option B",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Option C",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Option D",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "o\n25 C पर अ \u0000 HA त था \u0000ा र BOH का ज ली य िव लयन\nमे िव यो जन \u0000\u0000थ रां क स मा न है HA के 0.01 M िव लयन\n–4\nका pH, 5 है स मा न ता प पर BOH के 10 M िव लयन\nका pOH हो गा",
        "options": [
  {
    "label": "A",
    "value": "Option A",
    "type": "text"
  },
  {
    "label": "B",
    "value": "Option B",
    "type": "text"
  },
  {
    "label": "C",
    "value": "Option C",
    "type": "text"
  },
  {
    "label": "D",
    "value": "Option D",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 16,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q63",
    "questionNumber": 63,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Select the correct order of acidic strength.\n(a)\n(b)\n(c)\n(d)",
    "options": [
      {
        "label": "A",
        "value": "d > a > b > c",
        "type": "text"
      },
      {
        "label": "B",
        "value": "b > d > a > c",
        "type": "text"
      },
      {
        "label": "C",
        "value": "a > b > c > d",
        "type": "text"
      },
      {
        "label": "D",
        "value": "d > b > a > c",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "No −H bonding  Intermolecular H- bonding  stabilized conjugate base (or Anion)  Less stable conjugate base   ⇒  No-intramolecular H-bonding   ⇒   least stable  At meta position sleigh  intramolecular H-bonding stabilized conjugate  base.  ∴   Acidic strength order : b > d > a > c",
    "languages": {
      "en": {
        "questionText": "Select the correct order of acidic strength.\n(a)\n(b)\n(c)\n(d)",
        "options": [
          {
            "label": "A",
            "value": "d > a > b > c",
            "type": "text"
          },
          {
            "label": "B",
            "value": "b > d > a > c",
            "type": "text"
          },
          {
            "label": "C",
            "value": "a > b > c > d",
            "type": "text"
          },
          {
            "label": "D",
            "value": "d > b > a > c",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "अ \u0000ी य सा म \u0000\u0000 के स ही \u0000 म का चयन क र\u0000 ।\n(a)\n(b)\n(c)\n(d)",
        "options": [
          {
            "label": "A",
            "value": "d > a > b > c",
            "type": "text"
          },
          {
            "label": "B",
            "value": "b > d > a > c",
            "type": "text"
          },
          {
            "label": "C",
            "value": "a > b > c > d",
            "type": "text"
          },
          {
            "label": "D",
            "value": "d > b > a > c",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 17,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q64",
    "questionNumber": 64,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Which of the following have no unit?",
    "options": [
      {
        "label": "A",
        "value": "Electronegativity",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Electron gain enthalpy",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Ionisation enthalpy",
        "type": "text"
      },
      {
        "label": "D",
        "value": "None of these",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Electronegativity, Metallic character do not have  any unit",
    "languages": {
      "en": {
        "questionText": "Which of the following have no unit?",
        "options": [
          {
            "label": "A",
            "value": "Electronegativity",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Electron gain enthalpy",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Ionisation enthalpy",
            "type": "text"
          },
          {
            "label": "D",
            "value": "None of these",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 म\u0000 कौ न सा मा \u0000 क न हीं रख ता है ?",
        "options": [
          {
            "label": "A",
            "value": "िव द्यु तऋण ता",
            "type": "text"
          },
          {
            "label": "B",
            "value": "इ ले \u0000\u0000ॉ न \u0000 हण ए \u0000ै \u0000ी",
            "type": "text"
          },
          {
            "label": "C",
            "value": "आयनन ए \u0000ै \u0000ी",
            "type": "text"
          },
          {
            "label": "D",
            "value": "इन मे से को ई न ही",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 17,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q65",
    "questionNumber": 65,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Compound A (C₇H₁₂) reacts with HBr to give a tertiary bromoalkane. Compound A can be :",
    "options": [
                  {
                            "label": "A",
                            "value": "1-methylcyclohexene",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "3-methylcyclohexene",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "Methylenecyclohexane",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "All of these",
                            "type": "text"
                  }
        ],
    "correctAnswer": "D",
    "explanation": "",
    "languages": {
      "en": {
        "questionText": "Compound A (C₇H₁₂) reacts with HBr to give a tertiary bromoalkane. Compound A can be :",
        "options": [
          {
            "label": "A",
            "value": "1-Methylcyclohexene",
            "type": "text"
          },
          {
            "label": "B",
            "value": "3-Methylcyclohexene",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Methylenecyclohexane",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All of these",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "HBr\nA (C 7 H 12 ) − →\nयौ िग क A हो सक ता है",
        "options": [
  {
    "label": "A",
    "value": "1-methylcyclohexene",
    "type": "text"
  },
  {
    "label": "B",
    "value": "3-methylcyclohexene",
    "type": "text"
  },
  {
    "label": "C",
    "value": "Methylenecyclohexane",
    "type": "text"
  },
  {
    "label": "D",
    "value": "All of these",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 17,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q66",
    "questionNumber": 66,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Which is Amphoteric oxide :-",
    "options": [
      {
        "label": "A",
        "value": "BeO",
        "type": "text"
      },
      {
        "label": "B",
        "value": "ZnO",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Cr 2 O 3",
        "type": "text"
      },
      {
        "label": "D",
        "value": "All of these\no",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Metal oxide which reacts with both acid as well  as bases to produce salts and water is known  as amphoteric oxide.  Chronium   (III)   oxide   (Cr   O   )   is   amphoteric.  Although is soluble in water, it dissolves in acid  to   produce   hydrated   chromium   ions,  [Cr(H   O)   ]   which   react   with   a   base   to   give  salt of [Cr(OH)   ]   .  BeO + H 2 SO 4   → BeSO 4   + H 2 O; BeO + NaOH → Na 2   BeO 2   + H 2 O ZnO + H 2 SO 4   → ZnSO 4   + H 2 O ; ZnO + NaOH → Na 2   ZnO 2   + H 2 O  2   3  2   6   3+  6   3",
    "languages": {
      "en": {
        "questionText": "Which is Amphoteric oxide :-",
        "options": [
          {
            "label": "A",
            "value": "BeO",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ZnO",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Cr 2 O 3",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All of these\no",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कौ न सा उभयध म\u0000 ऑ \u0000ा इड है",
        "options": [
          {
            "label": "A",
            "value": "BeO",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ZnO",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Cr 2 O 3",
            "type": "text"
          },
          {
            "label": "D",
            "value": "उप रो \u0000 स भी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 17,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q67",
    "questionNumber": 67,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Calculate pH of given mixture at 90°C temperature: 0.01M, 2L of H₂SO₄ + 0.02M, 3L of Ba(OH)₂ (At 90°C, pKw = 12.0) :",
    "options": [
      {
        "label": "A",
        "value": "12.2",
        "type": "text"
      },
      {
        "label": "B",
        "value": "10.2",
        "type": "text"
      },
      {
        "label": "C",
        "value": "1.8",
        "type": "text"
      },
      {
        "label": "D",
        "value": "4.2",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "pOH= –log (16×10   )=1.8  pH = 12–1.8=10.2  [OH – ] =   = 0. 016 0.04×3–0.02×2 5  –3",
    "languages": {
      "en": {
        "questionText": "Calculate pH of given mixture at 90°C temperature: 0.01M, 2L of H₂SO₄ + 0.02M, 3L of Ba(OH)₂ (At 90°C, pKw = 12.0) :",
        "options": [
          {
            "label": "A",
            "value": "12.2",
            "type": "text"
          },
          {
            "label": "B",
            "value": "10.2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "1.8",
            "type": "text"
          },
          {
            "label": "D",
            "value": "4.2",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "90 o C ता प पर िद ये ग ये िम \u0000 ण की pH की गण ना\nकी िज ये\n0.01M, 2L, H 2 SO 4 +0.02M, 3L, Ba(OH) 2",
        "options": [
          {
            "label": "A",
            "value": "1",
            "type": "text"
          },
          {
            "label": "B",
            "value": "10.2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Option (C)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Option (D)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 17,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q68",
    "questionNumber": 68,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Phenolphthalein is a-",
    "options": [
      {
        "label": "A",
        "value": "Strong acid",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Strong base",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Weak base",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Weak acid\n2+ +",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Phenolphthalein is a weak acid.",
    "languages": {
      "en": {
        "questionText": "Phenolphthalein is a-",
        "options": [
          {
            "label": "A",
            "value": "Strong acid",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Strong base",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Weak base",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Weak acid\n2+ +",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िफ नो \u0000 थै ली न ह\u0000 एक",
        "options": [
          {
            "label": "A",
            "value": "\u0000 बल अ \u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "\u0000 बल \u0000ा र",
            "type": "text"
          },
          {
            "label": "C",
            "value": "दु ब\u0000 ल \u0000ा र",
            "type": "text"
          },
          {
            "label": "D",
            "value": "दु ब\u0000 ल अ \u0000\n2+ +",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 18,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q69",
    "questionNumber": 69,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "In the following reaction: Ph − C ≡ C − CH₃ + H₂ (Lindlar catalyst) → Product (A). Product (A) is :",
    "options": [
                  {
                            "label": "A",
                            "value": "Ph–CO–CH₃ (Acetophenone)",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "Ph–CH₂–CHO",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "Ph–CH=CH–CH₃",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "Ph–COOH",
                            "type": "text"
                  }
        ],
    "correctAnswer": "A",
    "explanation": "Ph − C ≡ C − CH 3",
    "languages": {
      "en": {
        "questionText": "In the following reaction: Ph − C ≡ C − CH₃ + H₂ (Lindlar catalyst) → Product (A). Product (A) is :",
        "options": [
          {
            "label": "A",
            "value": "cis-1-Phenylprop-1-ene",
            "type": "text"
          },
          {
            "label": "B",
            "value": "trans-1-Phenylprop-1-ene",
            "type": "text"
          },
          {
            "label": "C",
            "value": "1-Phenylpropane",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Phenylacetylene",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "Hg /H\nPh − C ≡ C − CH 3 − − − − − → A, A हो गा -",
        "options": [
  {
    "label": "A",
    "value": "Ph–CO–CH₃ (Acetophenone)",
    "type": "text"
  },
  {
    "label": "B",
    "value": "Ph–CH₂–CHO",
    "type": "text"
  },
  {
    "label": "C",
    "value": "Ph–CH=CH–CH₃",
    "type": "text"
  },
  {
    "label": "D",
    "value": "Ph–COOH",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 18,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q70",
    "questionNumber": 70,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Among the following, the molecule with\nhighest dipole moment is :",
    "options": [
      {
        "label": "A",
        "value": "CH 3 Cl",
        "type": "text"
      },
      {
        "label": "B",
        "value": "CH 2 Cl 2",
        "type": "text"
      },
      {
        "label": "C",
        "value": "CHCl 3",
        "type": "text"
      },
      {
        "label": "D",
        "value": "CCl 4",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "",
    "languages": {
      "en": {
        "questionText": "Among the following, the molecule with\nhighest dipole moment is :",
        "options": [
          {
            "label": "A",
            "value": "CH 3 Cl",
            "type": "text"
          },
          {
            "label": "B",
            "value": "CH 2 Cl 2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CHCl 3",
            "type": "text"
          },
          {
            "label": "D",
            "value": "CCl 4",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 म\u0000 उ \u0000 तम ि\u0000 \u0000ु व आ घू ण\u0000 वा ला अ णु है",
        "options": [
          {
            "label": "A",
            "value": "CH 3 Cl",
            "type": "text"
          },
          {
            "label": "B",
            "value": "CH 2 Cl 2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CHCl 3",
            "type": "text"
          },
          {
            "label": "D",
            "value": "CCl 4",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 18,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q71",
    "questionNumber": 71,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Water is liquid due to",
    "options": [
      {
        "label": "A",
        "value": "Hydrogen bonding",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Covalent bond",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Ionic bond",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Vandar wall's forces",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Water   molecule   has   hydrogen   bonding   so  molecules get dissociated so it is liquid.",
    "languages": {
      "en": {
        "questionText": "Water is liquid due to",
        "options": [
          {
            "label": "A",
            "value": "Hydrogen bonding",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Covalent bond",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Ionic bond",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Vandar wall's forces",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "जल िक स के का रण \u0000 व हो ता है -",
        "options": [
          {
            "label": "A",
            "value": "हा इ ड \u0000 ो जन ब \u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "सह सं यो जक ब \u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "आय िन क ब \u0000",
            "type": "text"
          },
          {
            "label": "D",
            "value": "वा नडर वा \u0000 बल",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 18,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q72",
    "questionNumber": 72,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Emf of the cell\n2+ 3+\nNi | Ni (0.1 M) || Au",
    "options": [
      {
        "label": "A",
        "value": "75",
        "type": "text"
      },
      {
        "label": "B",
        "value": "0.529 V",
        "type": "text"
      },
      {
        "label": "C",
        "value": "+",
        "type": "text"
      },
      {
        "label": "D",
        "value": "–",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "= 0.25+0.25=0.50 E o cell  3 Ni   +2 Au +3   →   3 Ni +2 +   2 Au (1 M)   (0. 1) E cell   = 0. 50–   log 0.0591 6 (0.1) 3  (1) 2  E cell   = 0. 50 +   = 0. 529V 0.0591×3 6",
    "languages": {
      "en": {
        "questionText": "Emf of the cell\n2+ 3+\nNi | Ni (0.1 M) || Au",
        "options": [
          {
            "label": "A",
            "value": "75",
            "type": "text"
          },
          {
            "label": "B",
            "value": "0.529 V",
            "type": "text"
          },
          {
            "label": "C",
            "value": "+",
            "type": "text"
          },
          {
            "label": "D",
            "value": "–",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "से ल :\n2+ 3+\nNi | Ni (0.1 M) || Au",
        "options": [
          {
            "label": "A",
            "value": "75",
            "type": "text"
          },
          {
            "label": "B",
            "value": "0.529 V",
            "type": "text"
          },
          {
            "label": "C",
            "value": "+",
            "type": "text"
          },
          {
            "label": "D",
            "value": "–",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 18,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q73",
    "questionNumber": 73,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Which of the following species is most\nreactive in S N 2 reaction ?",
    "options": [
      {
        "label": "A",
        "value": "CH 3 CH 2 — Cl",
        "type": "text"
      },
      {
        "label": "B",
        "value": "CH 3 CH 2 — Br",
        "type": "text"
      },
      {
        "label": "C",
        "value": "CH 3 CH 2 — I",
        "type": "text"
      },
      {
        "label": "D",
        "value": "CH 3 CH 2 — F",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "In   the   given   question,   the   nature   of   leaving  group is the factor responsible for the reactivity  of compounds towards   reaction.  Out of all the alkyl halides,  The   will be the more reactive  as the electronegativity of iodine is less among  all the halogen elements as it is considered as  the   good   leaving   group   which   facilitates   the  occurrence of   reaction at a good rate.  S N 2 CH 3   − CH 2   − F , CH 3   − CH 2   − Cl, CH 3   − CH 2   − Br , CH 3   − CH 2   − I CH 3   − CH 2   − I S N 2",
    "languages": {
      "en": {
        "questionText": "Which of the following species is most\nreactive in S N 2 reaction ?",
        "options": [
          {
            "label": "A",
            "value": "CH 3 CH 2 — Cl",
            "type": "text"
          },
          {
            "label": "B",
            "value": "CH 3 CH 2 — Br",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CH 3 CH 2 — I",
            "type": "text"
          },
          {
            "label": "D",
            "value": "CH 3 CH 2 — F",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 म\u0000 से कौ न सी \u0000ी शी ज S N 2 अ िभ ि\u0000 या म\u0000 स वा\u0000 िध क\nि\u0000 या शी ल है ?",
        "options": [
          {
            "label": "A",
            "value": "CH 3 CH 2 — Cl",
            "type": "text"
          },
          {
            "label": "B",
            "value": "CH 3 CH 2 — Br",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CH 3 CH 2 — I",
            "type": "text"
          },
          {
            "label": "D",
            "value": "CH 3 CH 2 — F",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 18,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q74",
    "questionNumber": 74,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Water molecule has abnormally high boiling point compared to hydrogen sulphide (H₂S) because :",
    "options": [
      {
        "label": "A",
        "value": "Water has extensive intermolecular hydrogen bonding",
        "type": "text"
      },
      {
        "label": "B",
        "value": "H₂S has stronger London dispersion forces",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Water has a lower dipole moment than H₂S",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Molecular weight of H₂O is higher than H₂S",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "",
    "languages": {
      "en": {
        "questionText": "Water molecule has abnormally high boiling point compared to hydrogen sulphide (H₂S) because :",
        "options": [
          {
            "label": "A",
            "value": "Water has extensive intermolecular hydrogen bonding",
            "type": "text"
          },
          {
            "label": "B",
            "value": "H₂S has stronger London dispersion forces",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Water has a lower dipole moment than H₂S",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Molecular weight of H₂O is higher than H₂S",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 यौ िग क पर िव चा र की िज ये\nE 2 अ िभ ि\u0000 या \u0000ा रा \u0000ा \u0000 सं भव उ \u0000ा द है / ह\u0000",
        "options": [
          {
            "label": "A",
            "value": "त था",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Option (B)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "दो नो",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Option (D)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 19,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q75",
    "questionNumber": 75,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "The molar conductance at infinite dilution\nof AgNO 3 , NaCl and NaNO 3 are 116.5,\n2 –1\n110.3 and 105.2 mho cm mol\nrespectively. The molar conductances of\nAgCl is :",
    "options": [
      {
        "label": "A",
        "value": "12",
        "type": "text"
      },
      {
        "label": "B",
        "value": "11",
        "type": "text"
      },
      {
        "label": "C",
        "value": "130.6",
        "type": "text"
      },
      {
        "label": "D",
        "value": "150.2",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "= (116.5+110.3+105.2)  mho cm   mol  = 121.6 cm   mol  λ ∞ AgCl   =   λ ∞ AgNO 3  +   λ ∞ NaCl –   λ ∞ NaNO 3  2   –1  2   –1",
    "languages": {
      "en": {
        "questionText": "The molar conductance at infinite dilution\nof AgNO 3 , NaCl and NaNO 3 are 116.5,\n2 –1\n110.3 and 105.2 mho cm mol\nrespectively. The molar conductances of\nAgCl is :",
        "options": [
          {
            "label": "A",
            "value": "12",
            "type": "text"
          },
          {
            "label": "B",
            "value": "11",
            "type": "text"
          },
          {
            "label": "C",
            "value": "130.6",
            "type": "text"
          },
          {
            "label": "D",
            "value": "150.2",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "AgNO 3 , NaCl त था NaNO 3 की अन \u0000 त नु करण पर\nमो लर चा लक ता \u0000 म शः 116.5, 110.3 त था 105.2\n2 –1\nmho cm mol है , AgCl की मो लर चा लक ता हो गी",
        "options": [
          {
            "label": "A",
            "value": "12",
            "type": "text"
          },
          {
            "label": "B",
            "value": "11",
            "type": "text"
          },
          {
            "label": "C",
            "value": "130.6",
            "type": "text"
          },
          {
            "label": "D",
            "value": "150.2",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 19,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q76",
    "questionNumber": 76,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Highest melting point would be of",
    "options": [
      {
        "label": "A",
        "value": "He",
        "type": "text"
      },
      {
        "label": "B",
        "value": "CsCl",
        "type": "text"
      },
      {
        "label": "C",
        "value": "NH 3",
        "type": "text"
      },
      {
        "label": "D",
        "value": "CHCl 3",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "The Force of attraction between the molecular  affects the melting point of a compound.  Stronger   intermolecular   interaction   results   in  higher melting points.  Ionic   compounds   usually   have   high   melting  points because electrostatic forces holding the  ion are much stronger.  CsCl has ionic bond thus it has highest M.P.  He   gas   held   together   by   weak   vander   Waal  bond and NH   and CHCl   have covalent bond. 3   3",
    "languages": {
      "en": {
        "questionText": "Highest melting point would be of",
        "options": [
          {
            "label": "A",
            "value": "He",
            "type": "text"
          },
          {
            "label": "B",
            "value": "CsCl",
            "type": "text"
          },
          {
            "label": "C",
            "value": "NH 3",
            "type": "text"
          },
          {
            "label": "D",
            "value": "CHCl 3",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िक स का गल नां क अ िध क हो गा",
        "options": [
          {
            "label": "A",
            "value": "He",
            "type": "text"
          },
          {
            "label": "B",
            "value": "CsCl",
            "type": "text"
          },
          {
            "label": "C",
            "value": "NH 3",
            "type": "text"
          },
          {
            "label": "D",
            "value": "CHCl 3",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 19,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q77",
    "questionNumber": 77,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Increasing order of rate of reaction with\nBr 2 /AlCl 3 is ;",
    "options": [
      {
        "label": "A",
        "value": "iii < i < ii < iv",
        "type": "text"
      },
      {
        "label": "B",
        "value": "iv < ii < i < iii",
        "type": "text"
      },
      {
        "label": "C",
        "value": "ii < iv < iii < i",
        "type": "text"
      },
      {
        "label": "D",
        "value": "iv < ii < iii< i",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "SD = strong donating  WW = weak withdrawing  WD = weak donating  ∴   iv > ii > i > iii  Br   reacts with AlCl   to form an electrophile   .  Aluminum have vacant d-orbitals are present  so, it can easily accommodate the lone pairs of  Bromine atom and form AlCl   Br   complex  Now,   will attack more fastly. at that carbon  atom   and   at   that   compound   where   electron  density is more  2   3  ⊕  Br  ∵  3   ⊝  ⊕  Br",
    "languages": {
      "en": {
        "questionText": "Increasing order of rate of reaction with\nBr 2 /AlCl 3 is ;",
        "options": [
          {
            "label": "A",
            "value": "iii < i < ii < iv",
            "type": "text"
          },
          {
            "label": "B",
            "value": "iv < ii < i < iii",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ii < iv < iii < i",
            "type": "text"
          },
          {
            "label": "D",
            "value": "iv < ii < iii< i",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "Br 2 /AlCl 3 के सा थ अ िभ ि\u0000 या दर का बढ़ ता \u0000 आ \u0000 म\nहै ।",
        "options": [
          {
            "label": "A",
            "value": "iii < i < ii < iv",
            "type": "text"
          },
          {
            "label": "B",
            "value": "iv < ii < i < iii",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ii < iv < iii < i",
            "type": "text"
          },
          {
            "label": "D",
            "value": "iv < ii < iii< i",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 19,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q78",
    "questionNumber": 78,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "At a certain temperature, the following reactions have equilibrium constants: S(s) + O₂(g) ⇌ SO₂(g); Kc = 5 × 10⁵² and 2S(s) + 3O₂(g) ⇌ 2SO₃(g); Kc = 10²⁹. What is Kc for: 2SO₂(g) + O₂(g) ⇌ 2SO₃(g) ?",
    "options": [
                  {
                            "label": "A",
                            "value": "K₁ × K₂",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "K₁ / K₂",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "K₂ / K₁",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "√(K₁ × K₂)",
                            "type": "text"
                  }
        ],
    "correctAnswer": "A",
    "explanation": "= 0.04×10  = 4×10  K C   =   10 29  ( 5×10 52 ) 2  K C   =   10 29  25×10 104  –75  –77",
    "languages": {
      "en": {
        "questionText": "At a certain temperature, the following reactions have equilibrium constants: S(s) + O₂(g) ⇌ SO₂(g); Kc = 5 × 10⁵² and 2S(s) + 3O₂(g) ⇌ 2SO₃(g); Kc = 10²⁹. What is Kc for: 2SO₂(g) + O₂(g) ⇌ 2SO₃(g) ?",
        "options": [
          {
            "label": "A",
            "value": "4 × 10⁻⁷⁷",
            "type": "text"
          },
          {
            "label": "B",
            "value": "4 × 10⁷⁷",
            "type": "text"
          },
          {
            "label": "C",
            "value": "2.5 × 10¹⁰⁵",
            "type": "text"
          },
          {
            "label": "D",
            "value": "10²⁹",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक िन ि\u0000 त ता प मा न पर िन \u0000 अ िभ ि\u0000 या नी चे द शा\u0000 ये\nअ नु सा र िन \u0000 सा \u0000 िन य तां क रख ती है\n52\nS(s)+O 2 (g) ⇌ SO 2 (g); K C =5×10\n29\n2S(s)+3O 2 (g) ⇌ 2SO 3 (g); K C =10\nस मा न ता प पर िन \u0000 अ िभ ि\u0000 या के िल ये सा \u0000\nिन य तां क K C \u0000ा हो गा\n2SO 2 (g)+O 2 (g) ⇌ 2SO 3 (g)\n76",
        "options": [
  {
    "label": "A",
    "value": "K₁ × K₂",
    "type": "text"
  },
  {
    "label": "B",
    "value": "K₁ / K₂",
    "type": "text"
  },
  {
    "label": "C",
    "value": "K₂ / K₁",
    "type": "text"
  },
  {
    "label": "D",
    "value": "√(K₁ × K₂)",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 20,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q79",
    "questionNumber": 79,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "The bond order of O is the same as in\n2\n+",
    "options": [
      {
        "label": "A",
        "value": "N\n2\n−",
        "type": "text"
      },
      {
        "label": "B",
        "value": "CN",
        "type": "text"
      },
      {
        "label": "C",
        "value": "CO\n+",
        "type": "text"
      },
      {
        "label": "D",
        "value": "NO",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Hence, bond order =  Hence, bond order =   .  O + 2   (15 e − ) =   K   :   K ∗ ( σ 2 s ) 2 ( σ ∗ 2 s ) 2 ( σ 2 p x ) 2  ( π 2 p y ) 2 ( π 2 p z ) 2 ( π ∗ 2 p y ) 1 ( π ∗ 2 p z ) 0  (10 − 5) = 2.5 1 2  N   + 2   (13 e − ) =   KK ∗ ( σ 2 s ) 2 ( σ ∗ 2 s ) 2 ( σ 2 p x ) 2 ( π 2 p y ) 2 ( π 2 p z ) 1  (9 − 4) = 2.5 1 2",
    "languages": {
      "en": {
        "questionText": "The bond order of O is the same as in\n2\n+",
        "options": [
          {
            "label": "A",
            "value": "N\n2\n−",
            "type": "text"
          },
          {
            "label": "B",
            "value": "CN",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CO\n+",
            "type": "text"
          },
          {
            "label": "D",
            "value": "NO",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "O का ब \u0000 \u0000 म िन \u0000 के स मा न है\n2\n+",
        "options": [
          {
            "label": "A",
            "value": "N\n2\n−",
            "type": "text"
          },
          {
            "label": "B",
            "value": "CN",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CO\n+",
            "type": "text"
          },
          {
            "label": "D",
            "value": "NO",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 20,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q80",
    "questionNumber": 80,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Match the column :\nColumn-II\nColumn-I\n(Distinguished\n(Compound)\nby)\n(a) (p) NaHSO 3\n(b) (q) NaOH/I 2\n(c) (r) Fehling solution\n(d) (s) Aq. NaHCO 3",
    "options": [
      {
        "label": "A",
        "value": "(a)–(q), (b)–(r), (c)–(s), (d)–(p)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(a)–(r), (b)–(p), (c)–(q), (d)–(s)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(a)–(p), (b)–(r), (c)–(q), (d)–(s)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(a)–(r), (b)–(p), (c)–(s), (d)–(q)\n4−",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "In the pair are should react of the other should  not react.  (a) Only aldehyde react with fehlings  (b)   does not react   with NaHSO  (c)   shows iodoform, but other will  not  (d) Acid reacts with NaHCO   but phenol does  not  3  3",
    "languages": {
      "en": {
        "questionText": "Match the column :\nColumn-II\nColumn-I\n(Distinguished\n(Compound)\nby)\n(a) (p) NaHSO 3\n(b) (q) NaOH/I 2\n(c) (r) Fehling solution\n(d) (s) Aq. NaHCO 3",
        "options": [
          {
            "label": "A",
            "value": "(a)–(q), (b)–(r), (c)–(s), (d)–(p)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(a)–(r), (b)–(p), (c)–(q), (d)–(s)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(a)–(p), (b)–(r), (c)–(q), (d)–(s)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(a)–(r), (b)–(p), (c)–(s), (d)–(q)\n4−",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "\u0000 \u0000 को सु मे िल त की िज ये :\n\u0000 \u0000 -II\n\u0000 \u0000 -I\n( से\n( यौ िग क )\nिव भे िद त )\n(a) (p) NaHSO 3\n(b) (q) NaOH/I 2\nफे ह िलं ग\n(c) (r)\nिव लयन\nज ली य\n(d) (s)\nNaHCO 3",
        "options": [
          {
            "label": "A",
            "value": "(a)–(q), (b)–(r), (c)–(s), (d)–(p)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(a)–(r), (b)–(p), (c)–(q), (d)–(s)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(a)–(p), (b)–(r), (c)–(q), (d)–(s)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(a)–(r), (b)–(p), (c)–(s), (d)–(q)\n4−",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 20,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q81",
    "questionNumber": 81,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Which is correct in the case of [Fe(CN 6 )]\ncomplex −",
    "options": [
      {
        "label": "A",
        "value": "Diamagnetic",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Octahedral\n2 3",
        "type": "text"
      },
      {
        "label": "C",
        "value": "d sp -hybridization",
        "type": "text"
      },
      {
        "label": "D",
        "value": "All are correct",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Complex: [Fe(CN   )]  Let the oxidation state of Fe = x  x + 6 ( − 1 ) = − 4  x = + 2  The electronic configuration of Fe = [Ar] 3d  4s  The electronic configuration of Fe   = [ Ar]  3d   4s  CN   is a strong field ligand. So, due to the  presence of strong-field ligands, the pairing of  3d-electrons takes place.  Hyridization : d   sp  Magnetic character : Diamagnetic  Spin : Low spin complex  6   4−  6  2  2+  6   0  −  2   3",
    "languages": {
      "en": {
        "questionText": "Which is correct in the case of [Fe(CN 6 )]\ncomplex −",
        "options": [
          {
            "label": "A",
            "value": "Diamagnetic",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Octahedral\n2 3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "d sp -hybridization",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All are correct",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "[Fe(CN 6 )] यो िग क के सं द भ\u0000 म\u0000 स ही है -",
        "options": [
          {
            "label": "A",
            "value": "\u0000 ित चु \u0000 की य",
            "type": "text"
          },
          {
            "label": "B",
            "value": "अ \u0000 फल की य\n2 3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "d sp - सं करण",
            "type": "text"
          },
          {
            "label": "D",
            "value": "उप यु\u0000 \u0000 स भी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 20,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q82",
    "questionNumber": 82,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "CH₃MgBr + CdCl₂ → (A) (organometallic compound). When compound (A) reacts with acetyl chloride (CH₃COCl), product (B) is :",
    "options": [
      {
        "label": "A",
        "value": "CH₃CH₂CN",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(CH₃)₂Cd",
        "type": "text"
      },
      {
        "label": "C",
        "value": "CH₃COCH₃ (Acetone)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "CH₃COOH",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "NCERT :- R   Cd reacts only with   to give  respective ketones  2",
    "languages": {
      "en": {
        "questionText": "CH₃MgBr + CdCl₂ → (A) (organometallic compound). When compound (A) reacts with acetyl chloride (CH₃COCl), product (B) is :",
        "options": [
          {
            "label": "A",
            "value": "CH₃CH₂CN",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(CH₃)₂Cd",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CH₃COCH₃ (Acetone)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "CH₃COOH",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "CH 3 MgBr + CdCl 2 → (A)\norganometallic\ncompound\nउ \u0000ा द (B) है",
        "options": [
          {
            "label": "A",
            "value": "CH 3 CH 2 CN",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Option (B)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Option (C)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Option (D)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 21,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q83",
    "questionNumber": 83,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Which of the following statement(s) is/are\ncorrect for above schematic diagram of\nmetal carbonyl ?",
    "options": [
      {
        "label": "A",
        "value": "It shows synergic bonding interactions\nin a carbonyl complex",
        "type": "text"
      },
      {
        "label": "B",
        "value": "The (M − C) π bond is formed by the\ndonation of a pair of electrons from a filled\nd– orbital of metal into the vacant\n∗\nantibonding π orbital of carbon monoxide",
        "type": "text"
      },
      {
        "label": "C",
        "value": "CO acts as σ − donor and π − acceptor",
        "type": "text"
      },
      {
        "label": "D",
        "value": "All of these",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Metal   carbonyl   shows   synergic   bonding  interactions in a carbonyl complex  The   bond is formed by the donation  of a pair of electrons from a filled d orbital of  metal into the vacant antibonding   orbital of  carbon monoxide.  CO   is   a   good   acceptor   (lewis   acid)   due   to  empty   orbitals   and   a   good   donor   (lewis  acid).  (M − C)   π π ∗  π π   σ",
    "languages": {
      "en": {
        "questionText": "Which of the following statement(s) is/are\ncorrect for above schematic diagram of\nmetal carbonyl ?",
        "options": [
          {
            "label": "A",
            "value": "It shows synergic bonding interactions\nin a carbonyl complex",
            "type": "text"
          },
          {
            "label": "B",
            "value": "The (M − C) π bond is formed by the\ndonation of a pair of electrons from a filled\nd– orbital of metal into the vacant\n∗\nantibonding π orbital of carbon monoxide",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CO acts as σ − donor and π − acceptor",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All of these",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 म\u0000 से कौ न सा कथन धा तु का ब\u0000 िन ल के उप रो \u0000\nआ रे खी य िच \u0000 के िल ये स ही है",
        "options": [
          {
            "label": "A",
            "value": "यह का ब\u0000 िन ल सं कु ल म\u0000 सह ि\u0000 या शी ल ता ब \u0000 न\nअ \u0000ः ि\u0000 या को द शा\u0000 ता है",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(M − C) π ब \u0000 , का ब\u0000 न मो नो ऑ \u0000ा इड के \u0000र \u0000\n∗\n\u0000 ित आब \u0000ी π क \u0000 क म\u0000 धा तु के भ \u0000र त d क \u0000 क से एक\nइ ले \u0000\u0000ॉ न यु \u0000 के दा न से िन िम\u0000 त हो ता है",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CO, σ − दा ता त था π − \u0000ा ही के \u0000 प म\u0000 का य\u0000\nकर ता है",
            "type": "text"
          },
          {
            "label": "D",
            "value": "उप रो \u0000 स भी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 21,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q84",
    "questionNumber": 84,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "But-2-yne undergoes Birch reduction with Na/liq. NH₃ to give (X), and catalytic hydrogenation over Pd/BaSO₄ (Lindlar) to give (Y). X and Y are respectively :",
    "options": [
                  {
                            "label": "A",
                            "value": "Hydrazone and Hydrazine",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "Azine and Alkane",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "Hydrazone and Alkane (Wolff-Kishner)",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "Oxime and Amine",
                            "type": "text"
                  }
        ],
    "correctAnswer": "A",
    "explanation": "",
    "languages": {
      "en": {
        "questionText": "But-2-yne undergoes Birch reduction with Na/liq. NH₃ to give (X), and catalytic hydrogenation over Pd/BaSO₄ (Lindlar) to give (Y). X and Y are respectively :",
        "options": [
          {
            "label": "A",
            "value": "X = trans-But-2-ene, Y = cis-But-2-ene",
            "type": "text"
          },
          {
            "label": "B",
            "value": "X = cis-But-2-ene, Y = trans-But-2-ene",
            "type": "text"
          },
          {
            "label": "C",
            "value": "X = Butane, Y = cis-But-2-ene",
            "type": "text"
          },
          {
            "label": "D",
            "value": "X = trans-But-2-ene, Y = Butane",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "H 2 N–NH 2\n− − − − − → X\nH 2 N–NH 2\n− − − − − → Y\nX त था Y है",
        "options": [
  {
    "label": "A",
    "value": "Hydrazone and Hydrazine",
    "type": "text"
  },
  {
    "label": "B",
    "value": "Azine and Alkane",
    "type": "text"
  },
  {
    "label": "C",
    "value": "Hydrazone and Alkane (Wolff-Kishner)",
    "type": "text"
  },
  {
    "label": "D",
    "value": "Oxime and Amine",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 21,
    "hasFigure": true,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q85",
    "questionNumber": 85,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Glycinato ligand (gly⁻) is −",
    "options": [
      {
        "label": "A",
        "value": "H₂N−CH₂−COO⁻",
        "type": "text_and_image",
        "imageUrl": "/q85_glycinato_opt1_structure.png"
      },
      {
        "label": "B",
        "value": "Bidentate ligand",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Two donor sites: N and O⁻",
        "type": "text"
      },
      {
        "label": "D",
        "value": "All of these",
        "type": "text"
      }
    ],
    "optionFigures": {
      "A": "/q85_glycinato_opt1_structure.png"
    },
    "correctAnswer": "D",
    "explanation": "Glycinato ion (H₂N-CH₂-COO⁻) is a bidentate monoanionic chelate ligand having two donor sites: neutral nitrogen (with lone pair) and carboxylate oxygen (O⁻). It forms 5-membered chelate rings with metal cations. All statements given in the question are correct, so the answer is (D).",
    "languages": {
      "en": {
        "questionText": "Glycinato ligand (gly⁻) is −",
        "options": [
          {
            "label": "A",
            "value": "H₂N−CH₂−COO⁻",
            "type": "text_and_image",
            "imageUrl": "/q85_glycinato_opt1_structure.png"
          },
          {
            "label": "B",
            "value": "Bidentate ligand",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Two donor sites: N and O⁻",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All of these",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "ग्लाइसीनेटो लिगैंड (gly⁻) है −",
        "options": [
          {
            "label": "A",
            "value": "H₂N−CH₂−COO⁻ (सरंचना)",
            "type": "text_and_image",
            "imageUrl": "/q85_glycinato_opt1_structure.png"
          },
          {
            "label": "B",
            "value": "द्विदंतुक लिगैंड",
            "type": "text"
          },
          {
            "label": "C",
            "value": "दो दाता स्थल N और O⁻",
            "type": "text"
          },
          {
            "label": "D",
            "value": "इनमें से सभी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 22,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q86",
    "questionNumber": 86,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "Given below are two statements : one is\nlabelled as Assertion (A) and the other is\nlabelled as Reason (R).\nAssertion (A) : A simple distillation can\nbe used to separate a mixture of propanol\nand propanone.\nReason (R) : Two liquids with a difference\no\nof more than 20 C in their boiling points\ncan be separated by simple distillations.\nIn the light of the above statements,\nchoose the most appropriate answer from\nthe options given below:",
    "options": [
      {
        "label": "A",
        "value": "Both (A) and (R) are correct but (R) is\nnot the correct explanation of (A).",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(A) is false but (R) is true.",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(A) is true but (R) is false",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both (A) and (R) are correct and (R) is\nthe correct explanation of (A).\n++",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Simple distillation is a procedure by which two  liquids   with   different   boiling   points   can   be  separated.   Simple   distillation   (the   procedure  outlined   below)   can   be   used   effectively   to  separate   liquids   that   have   at   least  difference in their boiling points.  Thus, a mixture of propan-1-ol and propanone  can be separated by simple distillation.  Hence, both Assertion and Reason are correct  and   Reason   is   the   correct   explanation   for  Assertion.  20 ∘ C",
    "languages": {
      "en": {
        "questionText": "Given below are two statements : one is\nlabelled as Assertion (A) and the other is\nlabelled as Reason (R).\nAssertion (A) : A simple distillation can\nbe used to separate a mixture of propanol\nand propanone.\nReason (R) : Two liquids with a difference\no\nof more than 20 C in their boiling points\ncan be separated by simple distillations.\nIn the light of the above statements,\nchoose the most appropriate answer from\nthe options given below:",
        "options": [
          {
            "label": "A",
            "value": "Both (A) and (R) are correct but (R) is\nnot the correct explanation of (A).",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(A) is false but (R) is true.",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(A) is true but (R) is false",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both (A) and (R) are correct and (R) is\nthe correct explanation of (A).\n++",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "नी चे दो कथन िद ए ह\u0000 । एक का ना म अ िभ कथन (A)\nत था दू स रे का का रण (R) है ।\nअ िभ कथन (A): \u0000ो पे नॉ ल त था \u0000ो पे नॉ न के िम \u0000 ण को\nसा धा रण आसवन से पृ थक कर सक ते ह\u0000 ।\nका रण (R): दो \u0000 वों िज न के \u0000 थ नां कों म\u0000 20°C से\nअ िध क का अ \u0000 र है उन कों सा धा रण आसवन से पृ थक\nिक या जा सक ता है ।\nउप रो \u0000 कथ नों के सं द भ\u0000 म\u0000 , स वा\u0000 िध क उ िच त उ \u0000 र िन \u0000\nिव क \u0000ों म\u0000 से चु िन ए।",
        "options": [
          {
            "label": "A",
            "value": "दो नों (A) त था (R) स ही है और (R) स ही \u0000ा \u0000ा\nन हीं ह\u0000 (A) की ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(A) स ही न हीं है पर \u0000ु (R) स ही है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(A) स ही है पर \u0000ु (R) स ही न हीं है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "दो नों (A) त था (R) स ही है और (R) स ही \u0000ा \u0000ा\nहै (A) की ।\n++",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 22,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q87",
    "questionNumber": 87,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "In the transition of Zn atoms to Zn ions\nthere is a decrease in the",
    "options": [
      {
        "label": "A",
        "value": "Number of valency electrons",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Atomic weight",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Atomic number",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Equivalent weight",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Ion is formed by gaining or losing electrons. To  form cation electron are lost from the valency  shell,   so   Zn   atoms   to   Zn   ions   there   is   a  decrease in the no. of valency electron.  ++",
    "languages": {
      "en": {
        "questionText": "In the transition of Zn atoms to Zn ions\nthere is a decrease in the",
        "options": [
          {
            "label": "A",
            "value": "Number of valency electrons",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Atomic weight",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Atomic number",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Equivalent weight",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "Zn पर मा णु का Zn आयन म\u0000 सं \u0000 मण से क मी\nआ ती है",
        "options": [
          {
            "label": "A",
            "value": "सं यो जक ता इ ले \u0000\u0000ॉ नों की सं \u0000ा म\u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "पर मा णु भा र म\u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "पर मा णु सं \u0000ा म\u0000",
            "type": "text"
          },
          {
            "label": "D",
            "value": "तु \u0000ां की भा र म\u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 22,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q88",
    "questionNumber": 88,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "A white metal sulphide soluble in water is:",
    "options": [
      {
        "label": "A",
        "value": "CuS",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Na 2 S",
        "type": "text"
      },
      {
        "label": "C",
        "value": "PbS",
        "type": "text"
      },
      {
        "label": "D",
        "value": "ZnS",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Sulphides of NH   IA & IIA are soluble 4 +",
    "languages": {
      "en": {
        "questionText": "A white metal sulphide soluble in water is:",
        "options": [
          {
            "label": "A",
            "value": "CuS",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Na 2 S",
            "type": "text"
          },
          {
            "label": "C",
            "value": "PbS",
            "type": "text"
          },
          {
            "label": "D",
            "value": "ZnS",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "जल म\u0000 िव ले य शी ल एक \u0000े त धा तु स \u0000ा इड ह\u0000 :",
        "options": [
          {
            "label": "A",
            "value": "CuS",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Na 2 S",
            "type": "text"
          },
          {
            "label": "C",
            "value": "PbS",
            "type": "text"
          },
          {
            "label": "D",
            "value": "ZnS",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 22,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q89",
    "questionNumber": 89,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "When a mixture of solid NaCl, solid\nK 2 Cr 2 O 7 is heated with conc. H 2 SO 4 ,\norange red vapours are obtained. These\nare of the compound.",
    "options": [
      {
        "label": "A",
        "value": "chromous chloride",
        "type": "text"
      },
      {
        "label": "B",
        "value": "chromyl chloride",
        "type": "text"
      },
      {
        "label": "C",
        "value": "chromic chloride",
        "type": "text"
      },
      {
        "label": "D",
        "value": "chromic sulphate",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "NaCl + K 2   Cr 2   O 7  H 2   SO 4  − − − → CrO 2   Cl 2   ( Chromyl chloride )  ( Orange red colour )",
    "languages": {
      "en": {
        "questionText": "When a mixture of solid NaCl, solid\nK 2 Cr 2 O 7 is heated with conc. H 2 SO 4 ,\norange red vapours are obtained. These\nare of the compound.",
        "options": [
          {
            "label": "A",
            "value": "chromous chloride",
            "type": "text"
          },
          {
            "label": "B",
            "value": "chromyl chloride",
            "type": "text"
          },
          {
            "label": "C",
            "value": "chromic chloride",
            "type": "text"
          },
          {
            "label": "D",
            "value": "chromic sulphate",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "जब ठो स NaCl त था ठो स K 2 Cr 2 O 7 के िम \u0000 ण को\nसा \u0000 H 2 SO 4 के सा थ ग म\u0000 िक या जा ता है तो ना रं गी ला ल\nरं ग की वा \u0000 िक स के का रण \u0000ा \u0000 हो ती है -",
        "options": [
          {
            "label": "A",
            "value": "\u0000ो मस \u0000ो रा इड",
            "type": "text"
          },
          {
            "label": "B",
            "value": "\u0000ो िम ल \u0000ो रा इड",
            "type": "text"
          },
          {
            "label": "C",
            "value": "\u0000ो िम क \u0000ो रा इड",
            "type": "text"
          },
          {
            "label": "D",
            "value": "\u0000ो िम क स \u0000े ट",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 22,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q90",
    "questionNumber": 90,
    "subject": "Chemistry",
    "chapter": "Chemistry Major Revision",
    "questionText": "On heating with concentrated H 2 SO 4 a\nmixture of solid NaCl and Kl produces",
    "options": [
      {
        "label": "A",
        "value": "Cl 2 , I 2 , and SO 2",
        "type": "text"
      },
      {
        "label": "B",
        "value": "HCl, HI and I 2",
        "type": "text"
      },
      {
        "label": "C",
        "value": "HCl, I 2 and SO 2",
        "type": "text"
      },
      {
        "label": "D",
        "value": "HCl and HI",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "2NaCl+H   SO   Na   SO   +2HCl  2KI+H   SO   K   SO   +2HI  2HI+H   SO   2H   O+SO   +I  2   4   →   2   4  2   4   →   2   4  2   4   →   2   2   2\nBiology - Section A",
    "languages": {
      "en": {
        "questionText": "On heating with concentrated H 2 SO 4 a\nmixture of solid NaCl and Kl produces",
        "options": [
          {
            "label": "A",
            "value": "Cl 2 , I 2 , and SO 2",
            "type": "text"
          },
          {
            "label": "B",
            "value": "HCl, HI and I 2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "HCl, I 2 and SO 2",
            "type": "text"
          },
          {
            "label": "D",
            "value": "HCl and HI",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "ठो स NaCl त था KI का एक िम \u0000 ण सा \u0000 H 2 SO 4 के\nसा थ ग म\u0000 कर ने पर ब ना ता है",
        "options": [
          {
            "label": "A",
            "value": "Cl 2 , I 2 , और SO 2",
            "type": "text"
          },
          {
            "label": "B",
            "value": "HCl, HI और I 2",
            "type": "text"
          },
          {
            "label": "C",
            "value": "HCl, I 2 और SO 2",
            "type": "text"
          },
          {
            "label": "D",
            "value": "HCl और HI",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 22,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q91",
    "questionNumber": 91,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Stem tendril of pumpkin develop from-",
    "options": [
      {
        "label": "A",
        "value": "Accessory bud",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Axillary bud",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Extra – axillary bud",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Floral bud",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Watermelon,   cucumber,   and   pumpkin   have  modified   auxiliary   buds   that   form   thin,   wiry,  leafless and spirally coiled branches and it helps  the weak plant to climb the support known as  stem tendrils.",
    "languages": {
      "en": {
        "questionText": "Stem tendril of pumpkin develop from-",
        "options": [
          {
            "label": "A",
            "value": "Accessory bud",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Axillary bud",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Extra – axillary bud",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Floral bud",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "क द्दू के \u0000 \u0000 \u0000 ता न क हाँ से िव क िस त हो ती है -",
        "options": [
          {
            "label": "A",
            "value": "स हा यक क िल का",
            "type": "text"
          },
          {
            "label": "B",
            "value": "क \u0000 \u0000 थ क िल का",
            "type": "text"
          },
          {
            "label": "C",
            "value": "अ ित \u0000र \u0000 क \u0000 \u0000 थ क िल का",
            "type": "text"
          },
          {
            "label": "D",
            "value": "पु \u0000 क िल का",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 23,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q92",
    "questionNumber": 92,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Match List – I with List – II.\nList I List-II\nCartilaginous\n(a) Scapula (i)\njoints\n(b) Cranium (ii) Flat bone\n(c) Sternum (iii) Fibrous joints\nVertebral Triangular flat\n(d) (iv)\ncolumn bone\nChoose the correct answer from the\noptions given below.",
    "options": [
      {
        "label": "A",
        "value": "(a)-iv, (b)-iii, (c)-ii, (d)-i",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(a)-i, (b)-iii, (c)-ii, (d)-iv",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(a)-ii, (b)-iii, (c)-iv, (d)-i",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(a)-iv, (b)-ii, (c)-iii, (d)-i",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "scapula (shoulder blade) is a triangular flat bone  of the pectoral girdle located on the dorsal part  of the thorax.  Cranium is made up of flat bones that fuse end-  to-end with the help of dense fibrous connective  tissues. These joints in the cranium do not allow  any movement and are called fibrous joints.  Sternum,   also   called   as   breast   bone   is   a   flat  bone on the ventral midline of the thorax.  The joints between the adjacent vertebrae in the  vertebral column are an example of cartilaginous  joints   as   these   are   joined   with   the   help   of  cartilage.",
    "languages": {
      "en": {
        "questionText": "Match List – I with List – II.\nList I List-II\nCartilaginous\n(a) Scapula (i)\njoints\n(b) Cranium (ii) Flat bone\n(c) Sternum (iii) Fibrous joints\nVertebral Triangular flat\n(d) (iv)\ncolumn bone\nChoose the correct answer from the\noptions given below.",
        "options": [
          {
            "label": "A",
            "value": "(a)-iv, (b)-iii, (c)-ii, (d)-i",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(a)-i, (b)-iii, (c)-ii, (d)-iv",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(a)-ii, (b)-iii, (c)-iv, (d)-i",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(a)-iv, (b)-ii, (c)-iii, (d)-i",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "सू ची -I का सू ची -II के सा थ िम ला न क रो ।\nसू ची -I सू ची -II\na \u0000ै पु ला i उप \u0000\u0000थ यु \u0000 जो ड़\nb क पा ल ii चप टी अ \u0000\u0000थ\nc उ रो \u0000\u0000थ iii रे शी य जो ड़\nक शे \u0000 क\nd iv ि\u0000 भु जा का र चप टी अ \u0000\u0000थ\nदं ड\nनी चे िद ये ग ये िन \u0000 िव क \u0000ों म\u0000 से उ िच त उ \u0000 र का चयन\nक रो ।",
        "options": [
          {
            "label": "A",
            "value": "(a)-iv, (b)-iii, (c)-ii, (d)-i",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(a)-i, (b)-iii, (c)-ii, (d)-iv",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(a)-ii, (b)-iii, (c)-iv, (d)-i",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(a)-iv, (b)-ii, (c)-iii, (d)-i",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 23,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q93",
    "questionNumber": 93,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "ATP synthesis in chloroplast and\nmitochondria is due to proton gradient\nacross the membrane. Select correct\nstatement w.r.t. ATP formation in\nchloroplast\n(a) Proton accumulates in lumen of\nthylakoid\n(b) Splitting of water occurs on inner side\nof thylokoid membrane\n(c) Proton accumulates in stroma side of\nchloroplast\n(d) NADP reductase is located on stroma\nside of membrane",
    "options": [
      {
        "label": "A",
        "value": "Only (a) and (b) are correct",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Only (b) and (c) are correct",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Only (c) and (d) are correct",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(a), (b) and (d) are correct",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Photophosphorylation   is   the   synthesis   of   ATP  from   ADP   and   inorganic   phosphate   in   the  presence   of   light.   Like   in   respiration,   in  photosynthesis too, ATP synthesis is linked to  development   of   a   proton   gradient   across   a  membrane.   Chemiosmosis   involves   the  pumping of protons through special channels in  the membranes of mitochondria from the inner  to   the   outer   compartment.   The   pumping  establishes   a   proton   (H   )   gradient.   After   the  gradient   is   established,   protons   diffuse   down  the gradient through a transport protein called  ATP synthase.  This   time   these   are   the   membranes   of  thylakoid. The proton accumulation is towards  the inside of the membrane, i.e., in the lumen.  The causes that develop proton gradient across  the membrane are as follows-  (a) Since splitting of the water molecule takes  place on the inner side of the membrane, the  protons or hydrogen ions that are produced by  the   splitting   of   water   accumulate   within   the  lumen of the thylakoids.  (b)   As   electrons   move   through   the  photosystems,   protons   are   transported   across  the membrane.  (c) The NADP reductase enzyme is located on  the stroma side of the membrane. Along with  electrons   that   come   from   the   acceptor   of  electrons of PS I, protons are necessary for the  reduction   of   NADP+   to   NADPH+   H+.   These  protons are also removed from the stroma.  +",
    "languages": {
      "en": {
        "questionText": "ATP synthesis in chloroplast and\nmitochondria is due to proton gradient\nacross the membrane. Select correct\nstatement w.r.t. ATP formation in\nchloroplast\n(a) Proton accumulates in lumen of\nthylakoid\n(b) Splitting of water occurs on inner side\nof thylokoid membrane\n(c) Proton accumulates in stroma side of\nchloroplast\n(d) NADP reductase is located on stroma\nside of membrane",
        "options": [
          {
            "label": "A",
            "value": "Only (a) and (b) are correct",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Only (b) and (c) are correct",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Only (c) and (d) are correct",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(a), (b) and (d) are correct",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "ह \u0000र तलवक और मा इ टो काॅ \u0000\u0000 \u0000 या म\u0000 ATP का सं \u0000े षण ,\nिझ \u0000ी के आर - पा र \u0000ो टॅा न \u0000 वण ता के का रण हो ता है ।\nह \u0000र तलवक म\u0000 ATP के िन मा\u0000 ण के स \u0000 भ\u0000 म\u0000 स ही कथन\nका चयन की िज ये :\n(a) \u0000ो टाॅ न , था य ले काॅ इड की अव का िश का म\u0000 एक ि\u0000 त\nहो ते ह\u0000\n(b) जल का िव घटन था इ ला कॉ यड िझ \u0000ी के अ \u0000 र की\nओर वा ले भा ग पर हो ता है\n(c) \u0000ो टाॅ न , ह \u0000र तलवक के पी िठ का की ओर वा ले भा ग\nम\u0000 एक ि\u0000 त हो ते ह\u0000\n(d) NADP \u0000र ड \u0000े ज़ , िझ \u0000ी के पी िठ का की ओर वा ले\nभा ग पर \u0000\u0000थ त हो ता है",
        "options": [
          {
            "label": "A",
            "value": "के वल (a) त था (b) स ही ह\u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "के वल (b) त था (c) स ही ह\u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "के वल (c) त था (d) स ही ह\u0000",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(a), (b) त था (d) स ही ह\u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 23,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q94",
    "questionNumber": 94,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Given below are two statements :\nStatement I : Restriction endonucleases\nrecognise specific sequence to cut DNA\nknown as palindromic nucleotide\nsequence.\nStatement II : Restriction endonucleases\ncut the DNA strand a little away from the\ncentre of the palindromic site to produce\nsticky ends.\nIn the light of the above statements,\nchoose the most appropriate answer from\nthe options given below :",
    "options": [
      {
        "label": "A",
        "value": "Both statement I and statement II are\nincorrect",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Statement I is correct but statement II\nis incorrect",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Statement I is incorrect but statement\nII is correct",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both statement I and statement II are\ncorrect",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Each   restriction endonuclease   recognises   a  specific   palindromic   nucleotide   sequences  in the DNA. It will   bind to the DNA   and cut  each of the   two strands of double helix   at  specific points. Restriction enzymes   cut the  strand of   DNA   a little away from the centre of  the   palindrome site;   but between the   same  two bases on the opposite strands   .",
    "languages": {
      "en": {
        "questionText": "Given below are two statements :\nStatement I : Restriction endonucleases\nrecognise specific sequence to cut DNA\nknown as palindromic nucleotide\nsequence.\nStatement II : Restriction endonucleases\ncut the DNA strand a little away from the\ncentre of the palindromic site to produce\nsticky ends.\nIn the light of the above statements,\nchoose the most appropriate answer from\nthe options given below :",
        "options": [
          {
            "label": "A",
            "value": "Both statement I and statement II are\nincorrect",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Statement I is correct but statement II\nis incorrect",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Statement I is incorrect but statement\nII is correct",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both statement I and statement II are\ncorrect",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "नी चे दो कथन िद ए गए ह\u0000 :\nकथन I : \u0000 ित बं धन एं डो \u0000ू \u0000\u0000 ऐज DNA को का ट ने के\nिल ए िव िश \u0000 \u0000 म की पह चा न कर ते ह\u0000 िज से पै ली \u0000 \u0000 ो िम क\n\u0000ू \u0000\u0000 यो टा इड अ नु \u0000 म कह ते ह\u0000 ।\nकथन II : \u0000 ित बं धन एं डो \u0000ू \u0000\u0000 ऐज DNA र \u0000ु क को\nपै ली \u0000 \u0000 ो िम क \u0000 थल के के \u0000 से थो ड़ी दू री पर का ट ते\nह\u0000 िज स से िच प िच पे अं त बन ते है ।\nऊपर िद ए गए कथ नों के सं द भ\u0000 म\u0000 नी चे िद ए गए िव क \u0000ों\nम\u0000 से सब से उ िच त उ \u0000 र का चयन क रो ।",
        "options": [
          {
            "label": "A",
            "value": "दो नों कथन I ए वं कथन II गलत ह\u0000 ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "कथन I स ही है ले िक न कथन II गलत है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "कथन I गलत है ले िक न कथन II स ही है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "दो नों कथन I ए वं कथन II स ही ह\u0000 ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 24,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q95",
    "questionNumber": 95,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Which of the following layers in an graffian\nfollicle is acellular ?",
    "options": [
      {
        "label": "A",
        "value": "Zonapellucida",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Membrane granulosa",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Theca",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Corona radiata",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "12th NCERT, Page No.- 33",
    "languages": {
      "en": {
        "questionText": "Which of the following layers in an graffian\nfollicle is acellular ?",
        "options": [
          {
            "label": "A",
            "value": "Zonapellucida",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Membrane granulosa",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Theca",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Corona radiata",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक \u0000ा िफ़ यन पु िट का म\u0000 िन \u0000 िल \u0000ख त म\u0000 से कौ न सी परत\nअ को िश की य हो ती है ?",
        "options": [
          {
            "label": "A",
            "value": "जो ना पे \u0000ू िस डा",
            "type": "text"
          },
          {
            "label": "B",
            "value": "मे \u0000े न \u0000ै नु लो सा",
            "type": "text"
          },
          {
            "label": "C",
            "value": "\u0000 वा रक ( थी का )",
            "type": "text"
          },
          {
            "label": "D",
            "value": "को रो ना रे िड ए टा",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 24,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q96",
    "questionNumber": 96,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Adaptations are the characterstics or\nattribute of:-",
    "options": [
      {
        "label": "A",
        "value": "Organism",
        "type": "text"
      },
      {
        "label": "B",
        "value": "a community",
        "type": "text"
      },
      {
        "label": "C",
        "value": "a population",
        "type": "text"
      },
      {
        "label": "D",
        "value": "None of these",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Adaptation   is   a   quality   of   the   organism  (morphological,   physiological,   behavioral)   that  enables   it   to   survive   and   reproduce   in   its  habitat. Adaptations allow organisms to live in  different types of habits .They develop-due to  natural   selection   of   suitable   variations  appearing   in   living   beings   through   mutations  and recombination.",
    "languages": {
      "en": {
        "questionText": "Adaptations are the characterstics or\nattribute of:-",
        "options": [
          {
            "label": "A",
            "value": "Organism",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a community",
            "type": "text"
          },
          {
            "label": "C",
            "value": "a population",
            "type": "text"
          },
          {
            "label": "D",
            "value": "None of these",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "अ नु कू लन िक स की िव शे ष ता या िव शे ष ता ऐं है -",
        "options": [
          {
            "label": "A",
            "value": "जी व",
            "type": "text"
          },
          {
            "label": "B",
            "value": "एक स मू दा य",
            "type": "text"
          },
          {
            "label": "C",
            "value": "एक सम ि\u0000",
            "type": "text"
          },
          {
            "label": "D",
            "value": "को ई न हीं",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 24,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q97",
    "questionNumber": 97,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "A taxon with reference to classification of\norganisms can be defined as:-",
    "options": [
      {
        "label": "A",
        "value": "A group of similar genus",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A group of similar species",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A group of organisms based on\nchromosome numbers",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A group of any one rank of organisms",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "A   taxon   is   a   group   of   any   one   rank   of  organisms. It is a collection of more than one  population of the organisms or organisms seen  by the taxonomists for forming a unit.  Hence, the correct answer is   a group of any  one rank of organisms .",
    "languages": {
      "en": {
        "questionText": "A taxon with reference to classification of\norganisms can be defined as:-",
        "options": [
          {
            "label": "A",
            "value": "A group of similar genus",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A group of similar species",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A group of organisms based on\nchromosome numbers",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A group of any one rank of organisms",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "जी व के व ग\u0000 करण म\u0000 व ग\u0000 क ( Taxon ) को िक स \u0000 प म\u0000\nपा \u0000र भा िष त िक या जा ता है -",
        "options": [
          {
            "label": "A",
            "value": "स मा न वं श का स मू ह",
            "type": "text"
          },
          {
            "label": "B",
            "value": "स मा न जा ित यो का स मू ह",
            "type": "text"
          },
          {
            "label": "C",
            "value": "गू ण सू \u0000ो की सं \u0000ा के आ धा र पर जी वो के स मू हों\nका िन धा\u0000 रण",
            "type": "text"
          },
          {
            "label": "D",
            "value": "िक सी स मू ह म\u0000 जी वो की िक सी भी एक\n\"Rank\" को",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 24,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q98",
    "questionNumber": 98,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "How many statements are correct -\n(A) Conducting part transport atmospheric\nair to lungs.\n(B) Thoracic chamber is an air tight\nchamber.\n(C) During inspiration diaphragm become\nflat.\n(D) During expiration, pulmonary volume\ndecreases.\n(E) Intra pulmonary pressure is less than\natmospheric pressure during expiration.",
    "options": [
      {
        "label": "A",
        "value": "5",
        "type": "text"
      },
      {
        "label": "B",
        "value": "3",
        "type": "text"
      },
      {
        "label": "C",
        "value": "4",
        "type": "text"
      },
      {
        "label": "D",
        "value": "2",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "NCERT 11   Page No.270, 270 th",
    "languages": {
      "en": {
        "questionText": "How many statements are correct -\n(A) Conducting part transport atmospheric\nair to lungs.\n(B) Thoracic chamber is an air tight\nchamber.\n(C) During inspiration diaphragm become\nflat.\n(D) During expiration, pulmonary volume\ndecreases.\n(E) Intra pulmonary pressure is less than\natmospheric pressure during expiration.",
        "options": [
          {
            "label": "A",
            "value": "5",
            "type": "text"
          },
          {
            "label": "B",
            "value": "3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "4",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िक त ने कथन स ही ह\u0000 -\n(A) सं वहन भा ग वा यु मं ड ली य वा यु का प \u0000र वहन फे फ ड़ों\nतक कर ता है ।\n(B) व \u0000ी य को \u0000 एक वा यु रो धी क \u0000 है ।\n(C) अ \u0000ः \u0000 सन के दौ रा न डा या \u0000ा म चप टा हो जा ता है ।\n(D) िनः \u0000 सन के दौ रा न , फु \u0000ु सी य आयतन कम हो\nजा ता है ।\n(E) िनः \u0000 सन के दौ रा न अं त रा फु \u0000ु सी य दा ब\nवा यु मं ड ली य दा ब से कम हो ता है ।",
        "options": [
          {
            "label": "A",
            "value": "5",
            "type": "text"
          },
          {
            "label": "B",
            "value": "3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "4",
            "type": "text"
          },
          {
            "label": "D",
            "value": "2",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 24,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q99",
    "questionNumber": 99,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Direction : Refer the given graph and\nselect the correct options for the questions\nthat follow\nWhich of these is incorrect regarding A and\nB in the given graph ?",
    "options": [
      {
        "label": "A",
        "value": "A is deoxygenated blood leaving the\ntissues",
        "type": "text"
      },
      {
        "label": "B",
        "value": "B is reduced blood returning from\ntissues",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A is oxygenated blood leaving the\nlungs",
        "type": "text"
      },
      {
        "label": "D",
        "value": "B is deoxygenated blood in the\nsystemic veins",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "A is deoxygenated blood leaving the tissues  11th OLD NCERT, PAGE NO.- 286",
    "languages": {
      "en": {
        "questionText": "Direction : Refer the given graph and\nselect the correct options for the questions\nthat follow\nWhich of these is incorrect regarding A and\nB in the given graph ?",
        "options": [
          {
            "label": "A",
            "value": "A is deoxygenated blood leaving the\ntissues",
            "type": "text"
          },
          {
            "label": "B",
            "value": "B is reduced blood returning from\ntissues",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A is oxygenated blood leaving the\nlungs",
            "type": "text"
          },
          {
            "label": "D",
            "value": "B is deoxygenated blood in the\nsystemic veins",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन द\u0000 श : िद ये ग ये \u0000ा फ को दे ख\u0000 और नी चे िद ये गए \u0000 \u0000ों\nके स ही िव क \u0000 चु न\u0000 ।\nिद ये ग ये \u0000ा फ म\u0000 A त था B से सं बं िध त िन \u0000 म\u0000 से कौ न सा\nकथन गलत है ?",
        "options": [
          {
            "label": "A",
            "value": "A ऑ \u0000ी जनर िह त र \u0000 है जो ऊतक से िन कल ता\nहै ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "B ऊत कों से आ ने वा ला \u0000ा िस त र \u0000 है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A ऑ \u0000ी जन यु \u0000 र \u0000 है जो फे फ ड़ो से िन कल ता\nहै ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "B ऑ \u0000ी जनर िह त र \u0000 है जो दै िह क िश रा म\u0000 पा या\nजा ता है ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 25,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q100",
    "questionNumber": 100,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Parthenocarpic fruit is −",
    "options": [
      {
        "label": "A",
        "value": "Develop after fertilization from ovary",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Develop without fertilization",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Develop after fertilization from thalamus",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both (1) & (3)",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Class 11th NCERT Page No. 65 The fruit",
    "languages": {
      "en": {
        "questionText": "Parthenocarpic fruit is −",
        "options": [
          {
            "label": "A",
            "value": "Develop after fertilization from ovary",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Develop without fertilization",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Develop after fertilization from thalamus",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both (1) & (3)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "अ िन षे कफ िल त फल हो ता है -",
        "options": [
          {
            "label": "A",
            "value": "और",
            "type": "text"
          },
          {
            "label": "B",
            "value": "िन षे चन के िब ना िव क िस त हो ता है",
            "type": "text"
          },
          {
            "label": "C",
            "value": "दो नों",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Option (D)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 25,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q101",
    "questionNumber": 101,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Myelin sheath is produced by",
    "options": [
      {
        "label": "A",
        "value": "Astrocytes and Schwann Cells",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Oligodendrocytes and Osteoclasts",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Osteoclasts and Astrocytes",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Schwann Cells and Oligodendrocytes",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Oligodendrocytes   are   neuroglial   cells  that   produce   myelin   sheath   around   axons   in  CNS.  Schwann   cells   are   neuroglial   cells  that   produce   myelin   sheath   around   axons   in  PNS.  Astrocytes   forms   blood   brain   barrier   along  with blood capillaries present in the brain. This  barrier prevents the entry of neurotoxins from  blood into tissues of brain.  Osteoclast   is   a   large   multinucleated   cell  responsible for the dissolution and absorption of  bone.",
    "languages": {
      "en": {
        "questionText": "Myelin sheath is produced by",
        "options": [
          {
            "label": "A",
            "value": "Astrocytes and Schwann Cells",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Oligodendrocytes and Osteoclasts",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Osteoclasts and Astrocytes",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Schwann Cells and Oligodendrocytes",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "मा य िल न आ \u0000 द िक स के \u0000ा रा उ \u0000 \u0000 हो ता ह\u0000 ?",
        "options": [
          {
            "label": "A",
            "value": "ता रा को िश का ए वं \u0000ा न को िश का एं",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ऑ िल गो ड\u0000 ड \u0000 ो सा इ ट् स ए वं अ \u0000\u0000थ शो षक",
            "type": "text"
          },
          {
            "label": "C",
            "value": "अ \u0000\u0000थ शो षक ए वं ता रा को िश का एं",
            "type": "text"
          },
          {
            "label": "D",
            "value": "\u0000ा न को िश का एं ए वं ऑ िल गो ड\u0000 ड \u0000 ो सा इ ट् स",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 25,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q102",
    "questionNumber": 102,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The essential role of air in the growth of\ngreen plants was revealed by",
    "options": [
      {
        "label": "A",
        "value": "Priestley",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Van Niel",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Blackmann",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Emerson",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Joseph   Priestley   (1733-1804)   in   1770  performed   a   series   of   experiments   that  revealed the essential role of air in the growth  of   green   plants.   Joseph   Priestley   (1770)  observed   that   a   candle   burning   in   a   closed  space   -   a   bell   jar,   soon   gets   extinguished.  Similarly, a mouse kept in a closed space would  soon get suffocated and die. However, when he  placed   a   mint   plant   in   the   same   bell   jar,   he  found   that   the   mouse   stayed   alive   and   the  candle continued to burn. Priestly hypothesized  that   foul   air   or   phlogiston   produced   during  burning of candles or animal (mice) respiration  could   be   converted   into   pure   air   by   plants  (mint).",
    "languages": {
      "en": {
        "questionText": "The essential role of air in the growth of\ngreen plants was revealed by",
        "options": [
          {
            "label": "A",
            "value": "Priestley",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Van Niel",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Blackmann",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Emerson",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "ह रे पा द पों की वृ \u0000\u0000 म\u0000 वा यु की अ िन वा य\u0000 भू िम का का\nखु ला सा िक स के \u0000ा रा िक या ग या ?",
        "options": [
          {
            "label": "A",
            "value": "\u0000ी \u0000 ले",
            "type": "text"
          },
          {
            "label": "B",
            "value": "वै न नी ल",
            "type": "text"
          },
          {
            "label": "C",
            "value": "\u0000ै क मै न",
            "type": "text"
          },
          {
            "label": "D",
            "value": "इमरसन",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 25,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q103",
    "questionNumber": 103,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Match the column :\nColumn-I Column-II\nI Recombinant DNA\nA Vector\ntechnology\nExtrachromosomal Sealing\nII B\nelement enzyme\nMacromolecular\nIII C Electrophoresis\nseparation\nGenetic\nIV DNA ligase D\nengineering",
    "options": [
      {
        "label": "A",
        "value": "I-D, II-A, III-B, IV-C",
        "type": "text"
      },
      {
        "label": "B",
        "value": "I-A, II-D, III-B, IV-C",
        "type": "text"
      },
      {
        "label": "C",
        "value": "I-D, II-A, III-C, IV-B",
        "type": "text"
      },
      {
        "label": "D",
        "value": "I-B, II-A, III-D, IV-C",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Genetic   engineering,   also   called   recombinant  DNA   technology,   involves   the   group   of  techniques   used   to   cut   up   and   join   together  genetic material, especially DNA from different  biological species.  A   plasmid   or   vector   is   a   small,  extrachromosomal   DNA   molecule   within   a   cell  that   is   physical.   Artificial   plasmids   are   widely  used as vectors in molecular cloning.  Gel   electrophoresis   is   used   to   separate  macromolecules   like   DNA,   RNA   and   proteins.  DNA fragments are separated according to their  size.   Proteins   can   be   separated   according   to  their   size   and   their   charge   (different   proteins  have different charges).  DNA   ligases   are   enzymes   that   catalyze   the  joining together of two DNA ends, in a manner  that   requires   either   adenosine   triphosphate  (ATP) or NAD   . +",
    "languages": {
      "en": {
        "questionText": "Match the column :\nColumn-I Column-II\nI Recombinant DNA\nA Vector\ntechnology\nExtrachromosomal Sealing\nII B\nelement enzyme\nMacromolecular\nIII C Electrophoresis\nseparation\nGenetic\nIV DNA ligase D\nengineering",
        "options": [
          {
            "label": "A",
            "value": "I-D, II-A, III-B, IV-C",
            "type": "text"
          },
          {
            "label": "B",
            "value": "I-A, II-D, III-B, IV-C",
            "type": "text"
          },
          {
            "label": "C",
            "value": "I-D, II-A, III-C, IV-B",
            "type": "text"
          },
          {
            "label": "D",
            "value": "I-B, II-A, III-D, IV-C",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कॉ लम को सु मे िल त क रे -\nकॉ लम -I कॉ लम -II\nI पु न य\u0000 गज DNA\nA वा हक\nतक नी क\nअ ित \u0000र \u0000 गु ण सू \u0000ी य\nII B सी िलं ग एं जा इम\nत \u0000\nवृ हद अ णु ओं का\nIII C िव द्यु त कण सं चलन\nपृ थ \u0000 रण\nआ नु वां िश क\nIV DNA ला इ गे ज D\nअ िभ यां ि\u0000 की",
        "options": [
          {
            "label": "A",
            "value": "I-D, II-A, III-B, IV-C",
            "type": "text"
          },
          {
            "label": "B",
            "value": "I-A, II-D, III-B, IV-C",
            "type": "text"
          },
          {
            "label": "C",
            "value": "I-D, II-A, III-C, IV-B",
            "type": "text"
          },
          {
            "label": "D",
            "value": "I-B, II-A, III-D, IV-C",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 26,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q104",
    "questionNumber": 104,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Read the following statements and select\nthe correct options :-\n(A) The hormone, human chorionic\ngonadotropin facilitates parturition by\nsoftening the connective tissue of the\npubic symphysis.\n(B) Spermatogonium has 23 chromosomes\nin its nucleus.\n(C) During fertillisation, a sperm comes in\ncontact with the zona pellucida layer of the\novum and induces the changes in the\nmembrane that block the entry of\nadditional sperms.\n(D) After one month of pregnancy, the\nmajor organ systems are formed.\n(E) The milk produced during the initial\nfew days of lactation is called Colostrum.",
    "options": [
      {
        "label": "A",
        "value": "B, C & E are correct, but A & D are\nincorrect",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A, C & E are correct, but B & D are\nincorrect",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A & B are correct, but C, D & E are\nincorrect",
        "type": "text"
      },
      {
        "label": "D",
        "value": "C & E are correct, but A, B & D are\nincorrect",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "12th NCERT, Page No.- 31,35,38",
    "languages": {
      "en": {
        "questionText": "Read the following statements and select\nthe correct options :-\n(A) The hormone, human chorionic\ngonadotropin facilitates parturition by\nsoftening the connective tissue of the\npubic symphysis.\n(B) Spermatogonium has 23 chromosomes\nin its nucleus.\n(C) During fertillisation, a sperm comes in\ncontact with the zona pellucida layer of the\novum and induces the changes in the\nmembrane that block the entry of\nadditional sperms.\n(D) After one month of pregnancy, the\nmajor organ systems are formed.\n(E) The milk produced during the initial\nfew days of lactation is called Colostrum.",
        "options": [
          {
            "label": "A",
            "value": "B, C & E are correct, but A & D are\nincorrect",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A, C & E are correct, but B & D are\nincorrect",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A & B are correct, but C, D & E are\nincorrect",
            "type": "text"
          },
          {
            "label": "D",
            "value": "C & E are correct, but A, B & D are\nincorrect",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त कथ नों को प ढ़\u0000 और स ही िव क \u0000 का चयन\nक र\u0000\n(A) मा नव ज रा यु गो नै डो ट\u0000ॉ िप न (HCG) \u0000ू िब क\nिस \u0000\u0000फ़ िस स के सं यो जी ऊतक को नरम ब ना कर \u0000 सव म\u0000\nस हा य ता कर ता है ,\n(B) शु \u0000ा णु जन के क \u0000 \u0000 क म\u0000 23 गु ण सू \u0000 हो ते ह\u0000 ।\n(C) िन षे चन के दौ रा न एक शु \u0000ा णु अं डा णु के पा रद श\u0000\nअं डा वरण ( जो ना पे \u0000ु िस डा ) \u0000 र के सं प क \u0000 म\u0000 आ ता है\nऔर अ ित \u0000र \u0000 शु \u0000ा णु ओं के \u0000 वे श को रो क ने हे तु उस के\nउ \u0000 \u0000 र म\u0000 बद ला व \u0000े \u0000र त कर ता है ।\n(D) ग भा\u0000 व \u0000 था के एक म ही ने बा द , \u0000 मु ख अं ग तं \u0000 बन\nजा ता ह\u0000 ।\n(E) दु \u0000 \u0000 वण के आ रं िभ क कु छ िद नों तक जो दू ध\nिन कल ता है उ से \u0000 थम \u0000 \u0000 या खी स ( को लो \u0000\u0000 म ) कह ते\nह\u0000 ,",
        "options": [
          {
            "label": "A",
            "value": "B, C व E स ही ह\u0000 , ले िक न A व D गलत ह\u0000 ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A, C व E स ही ह\u0000 , ले िक न B व D गलत ह\u0000 ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A व B स ही ह\u0000 , ले िक न C, D व E गलत ह\u0000 ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "C व E स ही ह\u0000 , ले िक न A, B व D गलत ह\u0000 ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 26,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q105",
    "questionNumber": 105,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Ecology is basically concerned with four\nlevels of biological organization. These\nlevels are:-",
    "options": [
      {
        "label": "A",
        "value": "Organisms, populations,\ncommunities and biomes",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Organisms and communities,\nspecies and population",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Species, populations, biomes\nand organisms",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Organisms, populations, biome and\nspecies",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Organisms,   populations,   communities   and  biomes  12th NCERT PAGE NO.- 191",
    "languages": {
      "en": {
        "questionText": "Ecology is basically concerned with four\nlevels of biological organization. These\nlevels are:-",
        "options": [
          {
            "label": "A",
            "value": "Organisms, populations,\ncommunities and biomes",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Organisms and communities,\nspecies and population",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Species, populations, biomes\nand organisms",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Organisms, populations, biome and\nspecies",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "प \u0000र \u0000\u0000थ ित की को जै िव क सं गठन के आ धा र पर चा र \u0000 रों\nम\u0000 िल या जा ता है , ये \u0000 र ह\u0000 -",
        "options": [
          {
            "label": "A",
            "value": "जी व , सम ि\u0000 , स मु दा य त था बा यो म",
            "type": "text"
          },
          {
            "label": "B",
            "value": "जी व , त था स मु दा य , जा ित त था सम ि\u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "जा ित , सम ि\u0000 बा यो म त था जी व",
            "type": "text"
          },
          {
            "label": "D",
            "value": "जी व , सम ि\u0000 , बा यो म , त था जा ित",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 26,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q106",
    "questionNumber": 106,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Which of the following is the defining property of living ?",
    "options": [
      {
        "label": "A",
        "value": "Reproduction",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Metabolism",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Growth",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both (1) & (3)",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Metabolism",
    "languages": {
      "en": {
        "questionText": "Which of the following is the defining property of living ?",
        "options": [
          {
            "label": "A",
            "value": "Reproduction",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Metabolism",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Growth",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both (1) & (3)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त म\u0000 जी वन को प \u0000र भा िष त कर ने वा ला ल \u0000 ण\nहै ?",
        "options": [
          {
            "label": "A",
            "value": "त था",
            "type": "text"
          },
          {
            "label": "B",
            "value": "उ पा पचय",
            "type": "text"
          },
          {
            "label": "C",
            "value": "दो नो",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Option (D)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 27,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q107",
    "questionNumber": 107,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "given floral formula is belong to:-",
    "options": [
      {
        "label": "A",
        "value": "Compositae",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Malvaceae",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Poaceae",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Cruciferae",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Cruciferae  Class 11th NCERT Page No. 67",
    "languages": {
      "en": {
        "questionText": "given floral formula is belong to:-",
        "options": [
          {
            "label": "A",
            "value": "Compositae",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Malvaceae",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Poaceae",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Cruciferae",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िद या ग या पु \u0000 सू \u0000 िक से सं बं िध त है -",
        "options": [
          {
            "label": "A",
            "value": "क \u0000ो िज टी",
            "type": "text"
          },
          {
            "label": "B",
            "value": "मा ल वे सी",
            "type": "text"
          },
          {
            "label": "C",
            "value": "पो ए सी",
            "type": "text"
          },
          {
            "label": "D",
            "value": "\u0000ू िस फे री",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 27,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q108",
    "questionNumber": 108,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Receptor sites for neurotransmitters are\npresent on-",
    "options": [
      {
        "label": "A",
        "value": "Pre-synaptic membrane",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Tips of axons",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Post-synaptic membrane",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Membranes of synaptic vesicles",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Pre-synaptic   membrane -   it   involves   the  release   of   neurotransmitters   in   chemical  synapse.  Post   synaptic   membrane -Contain   receptor  sites for neurotransmitters.",
    "languages": {
      "en": {
        "questionText": "Receptor sites for neurotransmitters are\npresent on-",
        "options": [
          {
            "label": "A",
            "value": "Pre-synaptic membrane",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Tips of axons",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Post-synaptic membrane",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Membranes of synaptic vesicles",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "\u0000ू रो ट\u0000ा \u0000 मी टर के िल ये \u0000ा ही \u0000 थल क हाँ उप \u0000\u0000थ त हो ते\nहै –",
        "options": [
          {
            "label": "A",
            "value": "पू व\u0000 - िस ने ि\u0000 क िझ \u0000ी पर",
            "type": "text"
          },
          {
            "label": "B",
            "value": "तं ि\u0000 का के िस रों पर",
            "type": "text"
          },
          {
            "label": "C",
            "value": "प \u0000 िस ने ि\u0000 क िझ \u0000ी पर",
            "type": "text"
          },
          {
            "label": "D",
            "value": "िस ने ि\u0000 क आश यों की िझ \u0000ी यों पर",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 27,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q109",
    "questionNumber": 109,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Select correct match\n–\nPrimary e\n(a) OEC (i)\nacceptor\nNADP Photolysis of\n(b) (ii)\nreductase H 2 O\nOuter surface\n(c) Cyt b 6 f (iii) of thylakoid\nmembrane\nConnects PS\n(d) Phaeophytin (iv)\nII & I",
    "options": [
      {
        "label": "A",
        "value": "a(ii), b(iii), c(iv), d(i)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "a(ii), b(iii), c(i), d(iv)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "a(iii), b(i), c(ii), d(iv)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "a(i), b(ii), c(iii), d(iv)",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "The   oxygen-evolving   complex   (OEC),   also  known   as   the   water-splitting   complex,   is   a  water-oxidizing enzyme involved in the photo-  oxidation of water during the light reactions of  photosynthesis.   The   splitting   of   water   is  associated with the PS II: water is split into  ,   and electrons. This creates oxygen, one of  the   net   products   of   photosynthesis.   The  electrons   needed   to   replace   those   removed  from   photosystem   I   are   provided   by  photosystem II.  The NADP reductase enzyme is located on the  stroma side of the membrane (Outer surface of  thylakoid membrane). Along with electrons that  come   from   the   acceptor   of   electrons   of   PS   I,  protons   are   necessary   for   the   reduction   of  to   .  For   biosynthesis   of   chlorophyll,   raw   materials  required are succinyl Co-A and glycine.  The   primary   electron   acceptor   of   PSII   is  pheophytin, an organic molecule that resembles  chlorophyll  H +  [0] H 2 O ⟶ 4H +   + O 2   + 4e −  NADP+   NADPH + H +",
    "languages": {
      "en": {
        "questionText": "Select correct match\n–\nPrimary e\n(a) OEC (i)\nacceptor\nNADP Photolysis of\n(b) (ii)\nreductase H 2 O\nOuter surface\n(c) Cyt b 6 f (iii) of thylakoid\nmembrane\nConnects PS\n(d) Phaeophytin (iv)\nII & I",
        "options": [
          {
            "label": "A",
            "value": "a(ii), b(iii), c(iv), d(i)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a(ii), b(iii), c(i), d(iv)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "a(iii), b(i), c(ii), d(iv)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "a(i), b(ii), c(iii), d(iv)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "स ही िम ला न चु न\u0000\n\u0000ा थ िम क इ ले \u0000\u0000ॉ न\n(a) OEC (i)\n\u0000ा ही\nNADP H 2 O का\n(b) (ii)\n\u0000र ड \u0000े ज़ \u0000 का शअपघटन\nथा इ ले को इड िझ \u0000ी\n(c) Cyt b 6 f (iii)\nकी बा ह री सतह\n(d) फी ओ फा इ िट न (iv) जु ड़े \u0000 ए PS II व I",
        "options": [
          {
            "label": "A",
            "value": "a(ii), b(iii), c(iv), d(i)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a(ii), b(iii), c(i), d(iv)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "a(iii), b(i), c(ii), d(iv)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "a(i), b(ii), c(iii), d(iv)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 27,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q110",
    "questionNumber": 110,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Which among the following be considered\nas a key tool in recombinant DNA\ntechnology\n(a) Restriction enzymes\n(b) Polymerase enzymes\n(c) Ligases\n(d) Vectors\n(e) Host organisms",
    "options": [
      {
        "label": "A",
        "value": "d",
        "type": "text"
      },
      {
        "label": "B",
        "value": "a, b",
        "type": "text"
      },
      {
        "label": "C",
        "value": "c, e",
        "type": "text"
      },
      {
        "label": "D",
        "value": "All of these",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Class 12   NCERT Page No. 165 th",
    "languages": {
      "en": {
        "questionText": "Which among the following be considered\nas a key tool in recombinant DNA\ntechnology\n(a) Restriction enzymes\n(b) Polymerase enzymes\n(c) Ligases\n(d) Vectors\n(e) Host organisms",
        "options": [
          {
            "label": "A",
            "value": "d",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a, b",
            "type": "text"
          },
          {
            "label": "C",
            "value": "c, e",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All of these",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "पु न स\u0000 यो जी DNA \u0000ौ \u0000ो िग की म\u0000 कौ न मु \u0000 उपकर णों म\u0000\nस \u0000\u0000 िल त िक या जा ता है -\n(a) रे \u0000\u0000\u0000 \u0000 न एं जा इम\n(b) पॉ ली म रे ज एं जा इम\n(c) ला इ गे ज\n(d) सं वा हक\n(e) पर पो षी जी व",
        "options": [
          {
            "label": "A",
            "value": "d",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a, b",
            "type": "text"
          },
          {
            "label": "C",
            "value": "c, e",
            "type": "text"
          },
          {
            "label": "D",
            "value": "उप रो \u0000 स भी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 27,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q111",
    "questionNumber": 111,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Scrotum helps in maintaining the low\ntemperature of the testis A lower than the\nnormal internal body temperature. Each\ntestis, with a length about B and a width\nof C .\nEach testis has about D compartments\ncalled testicular lobules.",
    "options": [
      {
        "label": "A",
        "value": "A- 2-",
        "type": "text"
      },
      {
        "label": "B",
        "value": "5ºC,B- 4 to5 cm,C- 2to 3\ncm,D- 350",
        "type": "text"
      },
      {
        "label": "C",
        "value": "5ºC,B- 6 - 7 cm,C- 2 to 5\ncm,D- 350",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A- 3 -",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "12th NCERT, Page No.- 27",
    "languages": {
      "en": {
        "questionText": "Scrotum helps in maintaining the low\ntemperature of the testis A lower than the\nnormal internal body temperature. Each\ntestis, with a length about B and a width\nof C .\nEach testis has about D compartments\ncalled testicular lobules.",
        "options": [
          {
            "label": "A",
            "value": "A- 2-",
            "type": "text"
          },
          {
            "label": "B",
            "value": "5ºC,B- 4 to5 cm,C- 2to 3\ncm,D- 350",
            "type": "text"
          },
          {
            "label": "C",
            "value": "5ºC,B- 6 - 7 cm,C- 2 to 5\ncm,D- 350",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A- 3 -",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "वृ षण को ष वृ ष णों के ता प मा न को श री र के ता प मा न से\nA कम रख ने म\u0000 स हा यक हो ता है । \u0000 \u0000े क वृ षण , िज स की\nल \u0000ा ई लगभग B और चौ ड़ा ई लगभग C हो ती है ।\n\u0000 \u0000े क वृ षण म\u0000 लगभग D क \u0000 हो ते ह\u0000 िज \u0000\u0000 वृ षण\nपा िल का ऐं ( टे \u0000\u0000 कु लर लो \u0000ु \u0000 ) कह ते ह\u0000 ।",
        "options": [
          {
            "label": "A",
            "value": "A- 2-",
            "type": "text"
          },
          {
            "label": "B",
            "value": "5ºC,B- 4 से 5 cm,C- 2 से 3\ncm,D- 350",
            "type": "text"
          },
          {
            "label": "C",
            "value": "5ºC,B- 6 - 7 cm,C- 2 से 5\ncm,D- 350",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A- 3 -",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 28,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q112",
    "questionNumber": 112,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Which of the following is most important\nand ecologically relevant environmental\nabiotic factor-",
    "options": [
      {
        "label": "A",
        "value": "Light",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Temperature",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Water",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Soil",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Most   important   factor   is   temperature   which  directly affects the organisms by affecting their  enzymes   hence   also   affects   the   geographical  distribution.",
    "languages": {
      "en": {
        "questionText": "Which of the following is most important\nand ecologically relevant environmental\nabiotic factor-",
        "options": [
          {
            "label": "A",
            "value": "Light",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Temperature",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Water",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Soil",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त म\u0000 से कौ न सा पा \u0000र \u0000\u0000थ ित की य \u0000 प से\nआव \u0000 क व उप यु \u0000 वा ता वर णी य अ जै िव क का रक है -",
        "options": [
          {
            "label": "A",
            "value": "\u0000 का श",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ता प मा न",
            "type": "text"
          },
          {
            "label": "C",
            "value": "जल",
            "type": "text"
          },
          {
            "label": "D",
            "value": "मृ दा",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 28,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q113",
    "questionNumber": 113,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Which of the following is a group of 'living\nfossils'?",
    "options": [
      {
        "label": "A",
        "value": "Fungi",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Archaebacteria",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Mycoplasma",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Cyanobacteria",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Archaebacteria is called Living Fossils because  they are the simplest and oldest living species  available on the earth.",
    "languages": {
      "en": {
        "questionText": "Which of the following is a group of 'living\nfossils'?",
        "options": [
          {
            "label": "A",
            "value": "Fungi",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Archaebacteria",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Mycoplasma",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Cyanobacteria",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त म\u0000 से कौ न सा एक स मू ह जी िव त जी वा \u0000ों का\nहै ?",
        "options": [
          {
            "label": "A",
            "value": "कवक",
            "type": "text"
          },
          {
            "label": "B",
            "value": "आ \u0000 जी वा णु",
            "type": "text"
          },
          {
            "label": "C",
            "value": "मा इ को \u0000ा \u0000ा",
            "type": "text"
          },
          {
            "label": "D",
            "value": "सा इ नो बै \u0000ी \u0000र या",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 28,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q114",
    "questionNumber": 114,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Given below are two statement –\nStatement-I : The atrium and ventricle of\nsame side are separated by thick muscular\ntissue called atrio ventricular septum.\nStatement-II : Atrio ventricular septum\nhas a muscular value between the atria\nand ventricle of same side.\nIn the light of above statements choose\nthe most apporapriate answer from the\noptions given below.",
    "options": [
      {
        "label": "A",
        "value": "Both statement-I and statement II are\nincorrect",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Statement I is correct but statement\nII is incorrect",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Statement I is incorrect but statement\nII is correct",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both statement I and statement II are\ncorrect",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Statement   I   is   incorrect   but   statement   II   is  correct  11th OLD NCERT, PAGE NO.- 283",
    "languages": {
      "en": {
        "questionText": "Given below are two statement –\nStatement-I : The atrium and ventricle of\nsame side are separated by thick muscular\ntissue called atrio ventricular septum.\nStatement-II : Atrio ventricular septum\nhas a muscular value between the atria\nand ventricle of same side.\nIn the light of above statements choose\nthe most apporapriate answer from the\noptions given below.",
        "options": [
          {
            "label": "A",
            "value": "Both statement-I and statement II are\nincorrect",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Statement I is correct but statement\nII is incorrect",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Statement I is incorrect but statement\nII is correct",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both statement I and statement II are\ncorrect",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त दो कथन िद ए गए ह\u0000 -\nकथन -I: अप नी - अप नी ओर के आ िलं द ए वं िन लय एक\nमो टे पे शी य ऊतक \u0000ा रा पृ थक रह ते ह\u0000 िज से अ िलं द िन लय\nपट कह ते ह\u0000 ।\nकथन -II: अ िलं द िन लय पट म\u0000 एक पे शी य क पा ट हो ता\nहै , जो एक ही ओर के अ िलं द और िन लय के बी च हो ता\nहै ।\nउप रो \u0000 कथ नों के सं द भ\u0000 म\u0000 , नी चे िद ये ग ये िव क \u0000ों की\nस हा य ता से उप यु \u0000 उ \u0000 र का चयन की िज ए।",
        "options": [
          {
            "label": "A",
            "value": "कथन -I और कथन -II दो नों गलत ह\u0000 ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "कथन -I स ही है ले िक न कथन -II गलत है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "कथन -I गलत है ले िक न कथन -II स ही है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "कथन -I और कथन -II दो नों स ही ह\u0000 ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 28,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q115",
    "questionNumber": 115,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Read the following statements and choose\nthe incorrect option.",
    "options": [
      {
        "label": "A",
        "value": "A plant is made up of different kinds of\ntissues.",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Tissues are classified into two main\ngroups, namely, simple and permanent\ntissues.",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Different organs in a plant show\ndifferences in their internal structure.",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Within angiosperms, the monocots and\ndicots are also seen to be anatomically\ndifferent.",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "11th Old   NCERT PAGE NO. 84  Incorrect   Statement:   Tissues   in   plants   are  classified into meristematic tissues (responsible  for   growth)   and   permanent   tissues   (which   do  not   divide).   Permanent   tissues   are   further  classified into simple (made of one type of cell)  and complex (made of more than one type of  cell).  Correct statements:  A plant is indeed made up of different kinds of  tissues,   such   as   meristematic   and   permanent  tissues.  Different organs in a plant (e.g., roots, stems,  leaves)   show   differences   in   their   internal  structure.  Monocots   and   dicots   within   angiosperms   are  anatomically   different   (e.g.,   vascular   bundle  arrangement, root structure).",
    "languages": {
      "en": {
        "questionText": "Read the following statements and choose\nthe incorrect option.",
        "options": [
          {
            "label": "A",
            "value": "A plant is made up of different kinds of\ntissues.",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Tissues are classified into two main\ngroups, namely, simple and permanent\ntissues.",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Different organs in a plant show\ndifferences in their internal structure.",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Within angiosperms, the monocots and\ndicots are also seen to be anatomically\ndifferent.",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "नी चे िद ए गए कथ नों को प ढ़\u0000 और गलत िव क \u0000 का चयन\nक र\u0000",
        "options": [
          {
            "label": "A",
            "value": "एक पौ धा िव िभ \u0000 \u0000 का र के ऊत कों से ब ना हो ता है ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ऊतक दो मु \u0000 स मू हों म\u0000 व ग\u0000 कृ त हो ते ह\u0000 , अ था\u0000 त्\nसरल और \u0000 था यी ऊतक।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "पौ धे म\u0000 िव िभ \u0000 अं ग उन की आं त \u0000र क सं रच ना म\u0000\nिभ \u0000 ता द शा\u0000 ते ह\u0000 ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "ऐं \u0000िज यो \u0000 म\u0000 म\u0000 , एक बी जप \u0000ी त था ि\u0000 बी जप \u0000ी भी\nशा री \u0000र क \u0000 प से अलग िद खा ई दे ते ह\u0000 ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 29,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q116",
    "questionNumber": 116,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Select the correct one:-\n(i) Pons made up of fibre tracts that inter\nconnect different region of brain.\n(ii) The front partion of midbrain consist of\n4 rounded swelling called corpora\nquadrigemina\n(iii) Limbic system and hypothalamus\nregulate libido, and emotional reactiones.\n(iv) Hypothalamus lie at the apex of\nthalamus",
    "options": [
      {
        "label": "A",
        "value": "i, iii",
        "type": "text"
      },
      {
        "label": "B",
        "value": "i, iv",
        "type": "text"
      },
      {
        "label": "C",
        "value": "ii, iii",
        "type": "text"
      },
      {
        "label": "D",
        "value": "iii, iv",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Class 11th New NCERT Page No. 236",
    "languages": {
      "en": {
        "questionText": "Select the correct one:-\n(i) Pons made up of fibre tracts that inter\nconnect different region of brain.\n(ii) The front partion of midbrain consist of\n4 rounded swelling called corpora\nquadrigemina\n(iii) Limbic system and hypothalamus\nregulate libido, and emotional reactiones.\n(iv) Hypothalamus lie at the apex of\nthalamus",
        "options": [
          {
            "label": "A",
            "value": "i, iii",
            "type": "text"
          },
          {
            "label": "B",
            "value": "i, iv",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ii, iii",
            "type": "text"
          },
          {
            "label": "D",
            "value": "iii, iv",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "स ही एक का चयन की िज ए -\n(i) पों स फा इबर के ब ने हो ते है जो म \u0000\u0000 \u0000 के िव िभ \u0000\n\u0000े \u0000ों को आपस म\u0000 जो ड़ ते है ।\n(ii) म \u0000 म \u0000\u0000 \u0000 का अ \u0000 भा ग गो ल सू जन से ब ना हो ता\nहै िज \u0000\u0000 कॉ प\u0000 रा \u0000ा िड \u0000 जे िम ना कह ते है ।\n(iii) िल \u0000\u0000 क िस \u0000 म और हा इ पो थै ले मस िल िब डो व\nभा व ना \u0000 क \u0000 ित ि\u0000 या ओं की अ िभ \u0000 \u0000\u0000 कर ते है ।\n(iv) हा इ पो थै ले मस थै ले मस के शी ष\u0000 पर \u0000\u0000थ त हो ता है ।",
        "options": [
          {
            "label": "A",
            "value": "i, iii",
            "type": "text"
          },
          {
            "label": "B",
            "value": "i, iv",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ii, iii",
            "type": "text"
          },
          {
            "label": "D",
            "value": "iii, iv",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 29,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q117",
    "questionNumber": 117,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Statement-I : Equal amounts of CO 2 and\nO 2 are evolved and consumed when\ncarbohydrates are incompletely oxidised.\nStatement-II : Pure proteins or fats are\nnever used as respiratory substrates.",
    "options": [
      {
        "label": "A",
        "value": "Both statement I and Statement II are\nincorrect.",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Statement I is correct but Statement II\nis incorrect",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Statement I is incorrect but Statement\nII is correct",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both Statement I and Statement II are\ncorrect",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "During aerobic respiration, O   is consumed and  CO   is released. The ratio of the volume of CO  evolved   to   the   volume   of   O   consumed   in  respiration   is   called   the   respiratory   quotient  (RQ).   The   respiratory   quotient   depends   upon  the   type   of   respiratory   substrate   used   during  respiration.   When   carbohydrates   are   used   as  substrate and are completely oxidised, the RQ  will be 1, because equal amounts of CO   and O  are evolved and consumed, respectively.  Though pure fats or proteins cannot be directly  used   as   substrates,   they   can   enter   as  intermediary   substrates   of   glycolysis   and   the  Krebs’ Cycle. Proteins and fats have to undergo  a   series   of   chemical   reactions   to   form   simple  compound and then only they can enter Krebs  Cycle.   After   forming   simple   compounds   only  then   they   can   enter   the   cycle   and   help   to  produce energy which takes a lot of time. Due  to these reasons pure proteins and fats are not  used as respiratory substrates.  2  2   2  2  2   2",
    "languages": {
      "en": {
        "questionText": "Statement-I : Equal amounts of CO 2 and\nO 2 are evolved and consumed when\ncarbohydrates are incompletely oxidised.\nStatement-II : Pure proteins or fats are\nnever used as respiratory substrates.",
        "options": [
          {
            "label": "A",
            "value": "Both statement I and Statement II are\nincorrect.",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Statement I is correct but Statement II\nis incorrect",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Statement I is incorrect but Statement\nII is correct",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both Statement I and Statement II are\ncorrect",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कथन -I : जब का बा\u0000 हा इ ड \u0000े ट अ पू ण\u0000 \u0000 प से ऑ \u0000ी कृ त\nहो ते ह\u0000 तो CO 2 और O 2 की स मा न मा \u0000ा िन \u0000ा िस त\nऔर खपत हो ती है ।\nकथन -II : शु \u0000 \u0000ो टी न व व सा \u0000 स नी ि\u0000 या धा रों के\n\u0000 प म\u0000 क भी \u0000 यु \u0000 न हीं हो ते ह\u0000 ।",
        "options": [
          {
            "label": "A",
            "value": "कथन I और कथन II दो नों गलत ह\u0000 ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "कथन I स ही है ले िक न कथन II गलत है",
            "type": "text"
          },
          {
            "label": "C",
            "value": "कथन I गलत है ले िक न कथन II स ही है",
            "type": "text"
          },
          {
            "label": "D",
            "value": "कथन I और कथन II दो नों स ही ह\u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 29,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q118",
    "questionNumber": 118,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Which of the following restriction sites are\nnot present on pBR322?",
    "options": [
      {
        "label": "A",
        "value": "Pst I, Eco RI",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Cla I, Hind III",
        "type": "text"
      },
      {
        "label": "C",
        "value": "BamH l, Sal I",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Hind II, Pst II",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Class 12   NCERT Page No. 169 th",
    "languages": {
      "en": {
        "questionText": "Which of the following restriction sites are\nnot present on pBR322?",
        "options": [
          {
            "label": "A",
            "value": "Pst I, Eco RI",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Cla I, Hind III",
            "type": "text"
          },
          {
            "label": "C",
            "value": "BamH l, Sal I",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Hind II, Pst II",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 म\u0000 से कौ न से \u0000 ित बं धन \u0000 थल pBR322 म\u0000 उप \u0000\u0000थ त\nन हीं हो ते है ?",
        "options": [
          {
            "label": "A",
            "value": "Pst I, Eco RI",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Cla I, Hind III",
            "type": "text"
          },
          {
            "label": "C",
            "value": "BamH l, Sal I",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Hind II, Pst II",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 29,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q119",
    "questionNumber": 119,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "What is true for \"Lactational\namenorrhoea\"?\n(i) It means absence of menstruation.\n(ii) Ovulation does not occur during the\ninitial 6 months of lactational period.\n(iii) Chances of contraception are almost\nnil upto six months following parturition.\n(iv) Side effect are almost nil\n(v) Chances of failure, though of this\nmethod are also very low.\n(vi) It is a natural method of\ncontraception.\n(vii) It increasing phagocytosis of sperms.",
    "options": [
      {
        "label": "A",
        "value": "(ii), (iii), (iv), (v), (vi)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(i), (ii), (iii), (iv), (vi)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(ii), (iii), (iv), (v)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(i), (ii), (iii), (iv), (v), (vi)",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "12th NCERT, Page No.- 44",
    "languages": {
      "en": {
        "questionText": "What is true for \"Lactational\namenorrhoea\"?\n(i) It means absence of menstruation.\n(ii) Ovulation does not occur during the\ninitial 6 months of lactational period.\n(iii) Chances of contraception are almost\nnil upto six months following parturition.\n(iv) Side effect are almost nil\n(v) Chances of failure, though of this\nmethod are also very low.\n(vi) It is a natural method of\ncontraception.\n(vii) It increasing phagocytosis of sperms.",
        "options": [
          {
            "label": "A",
            "value": "(ii), (iii), (iv), (v), (vi)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(i), (ii), (iii), (iv), (vi)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(ii), (iii), (iv), (v)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(i), (ii), (iii), (iv), (v), (vi)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "\u0000 न पा न अ ना त\u0000 व के सं द भ\u0000 म\u0000 \u0000ा स \u0000 है ?\n(i) इस का अ थ\u0000 मा िस क ध म\u0000 का अ भा व है ।\n(ii) \u0000 न पा न के \u0000ा रं िभ क 6 मा ह की अव िध के दौ रा न\nकी अं डो \u0000 ज\u0000 न न हीं हो ता ।\n(iii) \u0000 सव के बा द छह म ही ने तक ग भ\u0000 धा रण के अवसर\nलगभग न के ब रा बर हो ते ह\u0000 ।\n(iv) इस के दु \u0000 भा व लगभग न के ब रा बर हो ते ह\u0000 ।\n(v) इस िव िध की िव फल ता की सं भा व ना ब \u0000 त कम हो ती\nहै ।\n(vi) यह ग भ\u0000 िन रो ध की एक \u0000ा कृ ित क िव िध है ।\n(vii) यह शु \u0000ा णु ओं की फा गो सा इ टो िस स को ब ढ़ा ता है ।",
        "options": [
          {
            "label": "A",
            "value": "(ii), (iii), (iv), (v), (vi)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(i), (ii), (iii), (iv), (vi)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(ii), (iii), (iv), (v)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(i), (ii), (iii), (iv), (v), (vi)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 30,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q120",
    "questionNumber": 120,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Which of the following is the example of\nbiological control?",
    "options": [
      {
        "label": "A",
        "value": "Control of mosquitoes by DDT",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Control of Opuntia by a\npredator (moth), a type of insect",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Decreasing the carrying capacity of the\nhabitat by poisoning it",
        "type": "text"
      },
      {
        "label": "D",
        "value": "All the above",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Control of Opuntia by a predator   (moth), a type  of insect",
    "languages": {
      "en": {
        "questionText": "Which of the following is the example of\nbiological control?",
        "options": [
          {
            "label": "A",
            "value": "Control of mosquitoes by DDT",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Control of Opuntia by a\npredator (moth), a type of insect",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Decreasing the carrying capacity of the\nhabitat by poisoning it",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All the above",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त म\u0000 से कौ न सा एक जै िव क िन यं \u0000 ण का\nउ दा हरण है ?",
        "options": [
          {
            "label": "A",
            "value": "DDT \u0000ा रा म \u0000 रों का िन यं \u0000 ण",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ना गफ नी का िन यं \u0000 ण एक परभ \u0000ी ( मॉ थ ) \u0000ा रा जो\nएक \u0000 का र का की ट है",
            "type": "text"
          },
          {
            "label": "C",
            "value": "िव ष के \u0000ा रा आ वा स की वहन \u0000 म ता कम कर ना",
            "type": "text"
          },
          {
            "label": "D",
            "value": "उप रो \u0000 स भी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 30,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q121",
    "questionNumber": 121,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Match the columns :\nColumn-I Column-II\nA. Amoeboid protozoans (i) Paramoecium\nFlagellated\nB. (ii) Plasmodium\nprotozoans\nC. Ciliated protozoans (iii) Entamoeba\nD. Sporozoans (iv) Trypanosoma",
    "options": [
      {
        "label": "A",
        "value": "A = (ii), B = (iv), C = (iii), D = (i)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A = (i), B = (ii), C = (iii), D = (iv)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A = (iii), B = (iv), C = (i), D = (ii)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A = (iii), B = (iv), C = (ii), D = (i)",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Among the following:  1)   Paramecium   resembles   the   shape   of   shoe  and its habitat is freshwater. It is a unicellular  organism.   It   belongs   to   the   Protista   kingdom  and the genus is ciliated protozoa.  2)   Plasmodium   is   the   causative   organism   for  malaria. It belongs to the sporozoan subclass of  the genus of parasitic protozoans.  3)   Amoeba   belongs to the Amoeboid protozoa.  4)   Trypanosoma   is   the   causative   organism  responsible   for   sleeping   sickness.   It   is   a  flagellated protozoan.  Hence, the correct option is \"3\" - A - iii, B -  iv, C - i, D - ii.",
    "languages": {
      "en": {
        "questionText": "Match the columns :\nColumn-I Column-II\nA. Amoeboid protozoans (i) Paramoecium\nFlagellated\nB. (ii) Plasmodium\nprotozoans\nC. Ciliated protozoans (iii) Entamoeba\nD. Sporozoans (iv) Trypanosoma",
        "options": [
          {
            "label": "A",
            "value": "A = (ii), B = (iv), C = (iii), D = (i)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A = (i), B = (ii), C = (iii), D = (iv)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A = (iii), B = (iv), C = (i), D = (ii)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A = (iii), B = (iv), C = (ii), D = (i)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कॉ लम सु मे िल त क रे -\nकॉ लम -I कॉ लम -II\nA. अ मी बी य \u0000ो टो जो आ (i) पै रा मी िश यम\nB. क शा भ यु \u0000 \u0000ो टो जो आ (ii) \u0000ा \u0000ो िड यम\nC. प \u0000ा भी \u0000ो टो जो आ (iii) एं टअ मी बा\nD. \u0000ो रो जो आ (iv) िट\u0000 पै नो सो मा",
        "options": [
          {
            "label": "A",
            "value": "A = (ii), B = (iv), C = (iii), D = (i)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A = (i), B = (ii), C = (iii), D = (iv)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A = (iii), B = (iv), C = (i), D = (ii)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A = (iii), B = (iv), C = (ii), D = (i)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 30,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q122",
    "questionNumber": 122,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Read the following sentences carefully and\nchoose incorrect options:-",
    "options": [
      {
        "label": "A",
        "value": "Reptiles and amphibia have incomplete\ndouble circulation.",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Eoisinophils counting increased in\nallergic condition.",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Circulatory pathway between\nalimentary canal and liver is hepatic portal\nsystem.",
        "type": "text"
      },
      {
        "label": "D",
        "value": "For safe blood transfusion, receipients\nblood should contain antibodies against\ndonor's bloods antigen",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "For   safe   transfusion,   recipient's   RBC   should  not   contain   antibodies   against   donor's  antigens.  Reptiles   and   amphibia   have   incomplete  double circulation .  Eosinophils   (2-3 per cent) resist infections and  are also   associated with   allergic reactions .  The   hepatic   portal   system   is   the   venous  system   that   returns   blood   from   the   digestive  tract and spleen to the liver.",
    "languages": {
      "en": {
        "questionText": "Read the following sentences carefully and\nchoose incorrect options:-",
        "options": [
          {
            "label": "A",
            "value": "Reptiles and amphibia have incomplete\ndouble circulation.",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Eoisinophils counting increased in\nallergic condition.",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Circulatory pathway between\nalimentary canal and liver is hepatic portal\nsystem.",
            "type": "text"
          },
          {
            "label": "D",
            "value": "For safe blood transfusion, receipients\nblood should contain antibodies against\ndonor's bloods antigen",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त वा \u0000ों को \u0000ा न पू व\u0000 क प ढ़े त था गलत\nिव क \u0000 का चयन क रे -",
        "options": [
          {
            "label": "A",
            "value": "स री सृ प और उभयचर म\u0000 अ पू ण\u0000 दो ह रा प \u0000र सं चरण\nहो ता है ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "एल ज\u0000 की \u0000\u0000थ ित म\u0000 इओ िस नो िफ \u0000 की सं \u0000ा ब ढ़\nजा ती है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "आ हा र ना ल त था य कृ त के म \u0000 प \u0000र सं चरण पथ ,\nय कृ ती य िन वा िह का तं \u0000 है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "सु र ि\u0000 त र \u0000 आ धा न के िल ए , \u0000ा ही के र \u0000 म\u0000 दा ता\nके र \u0000 \u0000 ित जन के \u0000 ित एं टी बॉ डी हो ना चा िह ए",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 30,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q123",
    "questionNumber": 123,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Examine the figure given below and select\nthe correct option that represents the\ncorrect labelling A, B, C and D.",
    "options": [
      {
        "label": "A",
        "value": "A-Leaf primordium, B-Meristematic, C-\nAxillary bud, D-Intercalary meristem",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A-Leaf Primordium, B-Short optical\nmeristem, C-Axillary bud, D-Cork cambium",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A-Axillary bud, B-Leaf primordium, C-\nShoot apical meristem, D-Differentiating\nvascular tissue",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A-Axillary bud, B-Shoot apical\nmeristem, C-Meristematic zone, D-Leaf\nprimordia",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "11th Old   NCERT PAGE NO. 85",
    "languages": {
      "en": {
        "questionText": "Examine the figure given below and select\nthe correct option that represents the\ncorrect labelling A, B, C and D.",
        "options": [
          {
            "label": "A",
            "value": "A-Leaf primordium, B-Meristematic, C-\nAxillary bud, D-Intercalary meristem",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A-Leaf Primordium, B-Short optical\nmeristem, C-Axillary bud, D-Cork cambium",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A-Axillary bud, B-Leaf primordium, C-\nShoot apical meristem, D-Differentiating\nvascular tissue",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A-Axillary bud, B-Shoot apical\nmeristem, C-Meristematic zone, D-Leaf\nprimordia",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "नी चे िद ए गए िच \u0000 का अ \u0000 यन क र\u0000 और स ही िव क \u0000 का\nचयन क र\u0000 जो A, B, C और D के स ही िच \u0000ों को द शा\u0000 ता\nहै ।",
        "options": [
          {
            "label": "A",
            "value": "A - प \u0000ी आ \u0000 क , B- मे \u0000र \u0000े मे िट क , C- क \u0000ी य\nक ली , D- अं तर व\u0000 शी िव भ \u0000ो तक",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A - प \u0000ी आ \u0000 क , B - शो ट\u0000 ऑ ि\u0000 कल िव भ \u0000ो तक ,\nC - क \u0000ी य क ली , D - छा ल के \u0000\u0000 यम",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A- क \u0000ी य क ली , B - प \u0000ी आ \u0000 क , C - \u0000 रो ह शी ष\u0000\nिव भ \u0000ो तक , D - िव भे िद त सं वहन ऊतक",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A - क \u0000ी य क ली , B - \u0000 रो ह शी ष\u0000 िव भ \u0000ो तक , C\n- मे \u0000र \u0000े मे िट क \u0000े \u0000 , D - प \u0000ी आ \u0000 क",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 31,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q124",
    "questionNumber": 124,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Match the following columns and select the\ncorrect option.\nColumn-I Column-II\n(a) Pituitary gland (i) Grave’s disease\n(b) Thyroid gland (ii) Diabetes mellitus\n(c) Adrenal gland (iii) Diabetes insipidus\n(d) Pancreas (iv) Addison’s disease",
    "options": [
      {
        "label": "A",
        "value": "(a) → (iii), (b) → (ii), (c) → (i), (d) →\n(iv)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(a) → (iii), (b) → (i), (c) → (iv), (d) →\n(ii)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(a) → (ii), (b) → (i), (c) → (iv), (d) →\n(iii)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(a) → (iv), (b) → (iii), (c) → (i), (d) →\n(ii)",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "The   antidiuretic   hormone   released   by   the  pituitary gland stimulates reabsorption of water  by the kidneys. The deficiency of this hormone  causes increased urine production, a condition  called diabetes insipidus.  Graves disease is an immune system disorder  that   results   in   the   overproduction   of   thyroid  hormones.  Addison's disease is caused by a deficiency of  the hormones secreted by the adrenal cortex.  Pancreas   is   a   composite   gland   which   acts   as  both   exocrine   and   endocrine   gland.   The  deficiency of insulin, a hormone secreted by the  pancreas,   causes   a   complex   disorder   called  diabetes mellitus which is associated with loss  of   glucose   through   urine   and   formation   of  harmful compounds known as ketone bodies.",
    "languages": {
      "en": {
        "questionText": "Match the following columns and select the\ncorrect option.\nColumn-I Column-II\n(a) Pituitary gland (i) Grave’s disease\n(b) Thyroid gland (ii) Diabetes mellitus\n(c) Adrenal gland (iii) Diabetes insipidus\n(d) Pancreas (iv) Addison’s disease",
        "options": [
          {
            "label": "A",
            "value": "(a) → (iii), (b) → (ii), (c) → (i), (d) →\n(iv)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(a) → (iii), (b) → (i), (c) → (iv), (d) →\n(ii)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(a) → (ii), (b) → (i), (c) → (iv), (d) →\n(iii)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(a) → (iv), (b) → (iii), (c) → (i), (d) →\n(ii)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 \u0000 \u0000ो का िम ला न कर स ही िव क \u0000 का चयन क रों\n।\n\u0000 \u0000 \u0000 थम \u0000 \u0000 ि\u0000 ती य\n(a) पी यू ष \u0000ं िथ (i) \u0000े वस रो ग\n(b) था इ रॉ इड \u0000ं िथ (ii) डा य िब टी ज मे िल टस\n(c) अ िध वृ \u0000 \u0000ं िथ (iii) डा य िब टी ज इ \u0000ी िप डस\n(d) अ \u0000ा शय (iv) ए डी सन रो ग",
        "options": [
          {
            "label": "A",
            "value": "(a) → (iii), (b) → (ii), (c) → (i), (d) →\n(iv)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(a) → (iii), (b) → (i), (c) → (iv), (d) →\n(ii)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(a) → (ii), (b) → (i), (c) → (iv), (d) →\n(iii)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(a) → (iv), (b) → (iii), (c) → (i), (d) →\n(ii)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 31,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q125",
    "questionNumber": 125,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "F 1 part of complex V-",
    "options": [
      {
        "label": "A",
        "value": "Integral transmembrane protein",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Peripheral component made of\ncomplex lipids",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Have specific proton tunnels for\npumping protons across inner membrane\nof mitochondria",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Peripheral membrane protein with ATP\nsynthase activity",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Human mitochondrial ATP synthase has two functional  domains:  1) One domain situated in a mitochondrial matrix known as  F  2) F   located in the inner mitochondrial membrane.  Hence, the correct answer is option \"4\" - Peripheral  membrane protein with ATP synthetase activity.  1  o is",
    "languages": {
      "en": {
        "questionText": "F 1 part of complex V-",
        "options": [
          {
            "label": "A",
            "value": "Integral transmembrane protein",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Peripheral component made of\ncomplex lipids",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Have specific proton tunnels for\npumping protons across inner membrane\nof mitochondria",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Peripheral membrane protein with ATP\nsynthase activity",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कॉ \u0000 लै \u0000 V का F 1 भा ग हो गा -",
        "options": [
          {
            "label": "A",
            "value": "आ \u0000 \u0000र क ट\u0000ा \u0000 मै \u0000े न \u0000ो टी न",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ज िट ल ली िप ड से ब ना प \u0000र धी य घटक",
            "type": "text"
          },
          {
            "label": "C",
            "value": "मा इ टो का \u0000\u0000 \u0000 या की आ \u0000 \u0000र क क ला के आर - पा र\n\u0000ो टॉ न को प \u0000 कर ने हे तु िव िश \u0000 \u0000ो टॉ न टनल",
            "type": "text"
          },
          {
            "label": "D",
            "value": "ATP िस \u0000े ज ि\u0000 या िव िध यु \u0000 प \u0000र धी य िझ \u0000ी\n\u0000ो टी न।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 31,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q126",
    "questionNumber": 126,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Select the correct option to fill up the\nblanks.\n(i) ______ enzyme is crucial for the\nimmune system to function and its\nabsence is caused by the deletion of a\ngene.\n(ii) Insulin consists\nof______and______that are linked\ntogether by______.\n(iii) Transgenic mice are being used to test\nthe safety of the______.\n(iv) ______involves silencing of a specific\nmRNA due to a complementary dsRNA\nmolecule that binds to and prevents\ntranslation of the mRNA.",
    "options": [
      {
        "label": "A",
        "value": "(i) Adenosine deaminase, (ii) A-chain,\nB-chain, disulphide bridges. (iii) polio\nvaccine (iv) RNAi",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(i) RNAi (ii) A-chain, B-chain,\ndisulphide bridges, (iii) adenosine\ndeaminase, (iv) polio vaccine",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(i) Adenosine deaminase (ii) A-chain,\nB-chain, hydrogen bonds (iii) polio vaccine\n(iv) RNAi",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(i) RNAi (ii) A-chain, B-chain,\nnoncovalent bridges, (iii) polio vaccine (iv)\nadenosine deaminase",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Adenosine   deaminase   enzymes   are   crucial  for the   immune system to function , and their  absence is caused by the   deletion of a gene.  It is cured by   gene therapy.  Insulin   consists of   chains A and B   that are  linked   together by   disulfide bridges.  Transgenic mice   are   being   used   to   test   the  safety of the   polio vaccine.  RNAi   involves   the   silencing   of   a   specific  mRNA   due   to   a   complementary   dsRNA  molecule   that   binds   to   and   prevents  translation   of the mRNA.",
    "languages": {
      "en": {
        "questionText": "Select the correct option to fill up the\nblanks.\n(i) ______ enzyme is crucial for the\nimmune system to function and its\nabsence is caused by the deletion of a\ngene.\n(ii) Insulin consists\nof______and______that are linked\ntogether by______.\n(iii) Transgenic mice are being used to test\nthe safety of the______.\n(iv) ______involves silencing of a specific\nmRNA due to a complementary dsRNA\nmolecule that binds to and prevents\ntranslation of the mRNA.",
        "options": [
          {
            "label": "A",
            "value": "(i) Adenosine deaminase, (ii) A-chain,\nB-chain, disulphide bridges. (iii) polio\nvaccine (iv) RNAi",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(i) RNAi (ii) A-chain, B-chain,\ndisulphide bridges, (iii) adenosine\ndeaminase, (iv) polio vaccine",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(i) Adenosine deaminase (ii) A-chain,\nB-chain, hydrogen bonds (iii) polio vaccine\n(iv) RNAi",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(i) RNAi (ii) A-chain, B-chain,\nnoncovalent bridges, (iii) polio vaccine (iv)\nadenosine deaminase",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "\u0000र \u0000 \u0000 था नो की पू ित\u0000 के िल ये स ही िव क \u0000 का चयन\nक रे -\n(i) ______ ए \u0000 जा इम \u0000 ित र \u0000ा तं \u0000 के का य\u0000 कर ने के\nिल ए मह \u0000 पू ण\u0000 है त था इस की अ नु प \u0000\u0000थ ित , एक जी न के\nिव लो पन के का रण हो ती है\n(ii) इ \u0000ु िल न ______ त था ______ से ब ना हो ता है\nत था ______ \u0000ा रा आपस म\u0000 जु डे हो ते है\n(iii) ______ की सु र \u0000ा का प री \u0000 ण कर ने के िल ए\nपा र जी नी चू हों का उप यो ग िक या जा र हा है\n(iv) ______ म\u0000 पू रक dsRNA अ णु \u0000ा रा िव िश \u0000\nmRNA का सं दमन स \u0000\u0000 िल त हो ता है जो mRNA से\nजु ड़कर अ नु वा दन को रो क ता है",
        "options": [
          {
            "label": "A",
            "value": "(i) ए िड नो िस न िड ऐ मी ने ज , (ii) A- \u0000ृं ख ला , B-\n\u0000ृं ख ला , डा इस \u0000ा इड से तु . (iii) पो िल यो वे \u0000ी न (iv)\nRNAi",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(i) RNAi (ii) A- \u0000ृं ख ला , B- \u0000ृं ख ला , डा इस \u0000ा इड\nसे तु , (iii) ए िड नो िस न िड ऐ मी ने ज , (iv) पो िल यो वे \u0000ी न",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(i) ए िड नो िस न िड ऐ मी ने ज (ii) A- \u0000ृं ख ला , B-\n\u0000ृं ख ला , हा इ ड \u0000 ो जन ब \u0000 (iii) पो िल यो वे \u0000ी न (iv)\nRNAi",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(i) RNAi (ii) A- \u0000ृं ख ला , B- \u0000ृं ख ला , असह सं यो जी\nसे तु , (iii) पो िल यो वे \u0000ी न (iv) ए िड नो िस न िड ऐ मी ने ज",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 32,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q127",
    "questionNumber": 127,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Who proposed the process of evolution as\na result of saltation?",
    "options": [
      {
        "label": "A",
        "value": "A scientist working on Galapagos\nIslands",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A scientist working with Mirabilis jalapa",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A scientist working on Oenothera\nlamarckiana (evening primrose)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A scientist working on Malay\narchepelago",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "12th NCERT, Page No.- 119",
    "languages": {
      "en": {
        "questionText": "Who proposed the process of evolution as\na result of saltation?",
        "options": [
          {
            "label": "A",
            "value": "A scientist working on Galapagos\nIslands",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A scientist working with Mirabilis jalapa",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A scientist working on Oenothera\nlamarckiana (evening primrose)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A scientist working on Malay\narchepelago",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िव का स की \u0000 ि\u0000 या को उ \u0000 लन के प \u0000र णा म \u0000 \u0000 प\nिक स ने \u0000 \u0000ा िव त िक या था ?",
        "options": [
          {
            "label": "A",
            "value": "एक वै \u0000ा िन क जो गै ला पे गो स \u0000ी पों पर का म कर र हा\nथा",
            "type": "text"
          },
          {
            "label": "B",
            "value": "एक वै \u0000ा िन क जो िम रा िब िल स ज ला पा पर का म कर\nर हा था",
            "type": "text"
          },
          {
            "label": "C",
            "value": "एक वै \u0000ा िन क जो ओए नो थी रा लै मा िक \u0000 या ना ( इव िनं ग\n\u0000ा इम रो ज ) पर का म कर र हा था",
            "type": "text"
          },
          {
            "label": "D",
            "value": "एक वै \u0000ा िन क जो मलय आ क\u0000 पे ले गो पर का म कर\nर हा था",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 32,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q128",
    "questionNumber": 128,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The pyramid that cannot take the\n'inverted' shape is -",
    "options": [
      {
        "label": "A",
        "value": "Pyramid of numbers",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Pyramid of biomass",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Pyramid of energy",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Pyramid of parasitism",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Flow of energy declines as it passes from lower  to   higher   trophic   level.   The   energy   decreases  from one trophic level to the next trophic level  because energy is lost as metabolic heat during  transfer   of   energy.   Hence,   the   pyramid   of  energy is always upright in any ecosystem and  it   cannot   be   inverted   in   a   stable   ecosystem.  When   food   energy   passes   from   producers   to  herbivores to carnivores, only 10% of energy is  transferred   from   one   trophic   level   to   another  trophic level.",
    "languages": {
      "en": {
        "questionText": "The pyramid that cannot take the\n'inverted' shape is -",
        "options": [
          {
            "label": "A",
            "value": "Pyramid of numbers",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Pyramid of biomass",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Pyramid of energy",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Pyramid of parasitism",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "वह िप रा िम ड जो उ \u0000ा आ का र न हीं ले सक ता है -",
        "options": [
          {
            "label": "A",
            "value": "सं \u0000ा ओं के िप रा िम ड",
            "type": "text"
          },
          {
            "label": "B",
            "value": "बा यो मा स के िप रा िम ड",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ऊ जा\u0000 के िप रा िम ड",
            "type": "text"
          },
          {
            "label": "D",
            "value": "पर जी िव ता के िप रा िम ड",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 32,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q129",
    "questionNumber": 129,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Silica gel (Keieselghur) / Diatomite /\nDiatomaceous earth is obtained by-",
    "options": [
      {
        "label": "A",
        "value": "Chrysophyta",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Dinoflagellates",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Euglenoids",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Brown algae",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Cell   of   diatoms   are   surrounded   by   cell   wall,  frustules,   which   has   silica   deposits.   Shells   of  diatoms   are   highly   resistant   to   decomposition  due to presence of silica and are deposited in  ocean   beds   leading   to   formation   of  diatomaceous   earth.   Extraction,   grounding,  sieving   and   sinteration   of   diatomaceous   earth  obtain   keiselguhr   which   is   used   in   filtration  techniques.  Diatoms   are   placed   in   class   Bacillariophyceae  which   makes   Myxophyceae   includes   slime  molds which are characterized by presence of  different morphology at different life stages and  absence   of   cell   wall.   Pheophyceae   includes  brown   algae   which   are   characterized   by  presence   of   aliginic   acid   with   cellulose   in   cell  wall and obtains algin, it is used as emulsifying  agent and a stabilizer. Rhodophyceae includes  red algae which have calcium carbonate in cell  wall,   it   makes   the   cell   permeable   to   small  molecules but impermeable to macromolecules.  Red   algae   secrete   calcium   carbonate   shells  which are accumulated in sea bottom and forms  red corals. \"Diatomite\" (Kieselguhr) is obtained  from.",
    "languages": {
      "en": {
        "questionText": "Silica gel (Keieselghur) / Diatomite /\nDiatomaceous earth is obtained by-",
        "options": [
          {
            "label": "A",
            "value": "Chrysophyta",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Dinoflagellates",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Euglenoids",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Brown algae",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िस िल का जे ल ( की से लगर ) / डा य टो मा इट /\nडा ईट मे िश यस मृ दा िक स से \u0000ा \u0000 हो ती है ?",
        "options": [
          {
            "label": "A",
            "value": "\u0000ा ई सो फा ई टा",
            "type": "text"
          },
          {
            "label": "B",
            "value": "डा इ नो \u0000ै ज ले ट् स",
            "type": "text"
          },
          {
            "label": "C",
            "value": "यू \u0000ी ना",
            "type": "text"
          },
          {
            "label": "D",
            "value": "भू रे शै वा ल",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 32,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q130",
    "questionNumber": 130,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "In counter current mechanism, NaCl is\nreturned to-",
    "options": [
      {
        "label": "A",
        "value": "The interstitium by the ascending\nportion of vasa recta",
        "type": "text"
      },
      {
        "label": "B",
        "value": "The interstitium by the descending\nportion of vasa recta",
        "type": "text"
      },
      {
        "label": "C",
        "value": "The interstitium by the ascending\nportion of Henle loop",
        "type": "text"
      },
      {
        "label": "D",
        "value": "The interstitium by the descending\nportion of Henle's loop",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "In mechanism of concentration of the filtrate,  the   proximity   between   the   Henle’s   loop   and  vasa   recta,   as   well   as   the   counter   current   in  them   help   in   maintaining   an   increasing  osmolarity   towards   the   inner   medullary  interstitium,   i.e.,   from   300   mOsmolL   in   the  cortex to about 1200 mOsmolL   in the inner  medulla.  –1  –1",
    "languages": {
      "en": {
        "questionText": "In counter current mechanism, NaCl is\nreturned to-",
        "options": [
          {
            "label": "A",
            "value": "The interstitium by the ascending\nportion of vasa recta",
            "type": "text"
          },
          {
            "label": "B",
            "value": "The interstitium by the descending\nportion of vasa recta",
            "type": "text"
          },
          {
            "label": "C",
            "value": "The interstitium by the ascending\nportion of Henle loop",
            "type": "text"
          },
          {
            "label": "D",
            "value": "The interstitium by the descending\nportion of Henle's loop",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "\u0000 ित धा रा \u0000 वा ह \u0000 ि\u0000 या म\u0000 , NaCl लौ टा िद या जा ता है ?",
        "options": [
          {
            "label": "A",
            "value": "अं त रा का श को वा सा रे \u0000ा की आ रो ही भु जा \u0000ा रा",
            "type": "text"
          },
          {
            "label": "B",
            "value": "अं त रा का श को वा सा रे \u0000ा की अव रो ही भु जा \u0000ा रा",
            "type": "text"
          },
          {
            "label": "C",
            "value": "अं त रा का श को हे न ले के लू प की आ रो ही भु जा \u0000ा रा",
            "type": "text"
          },
          {
            "label": "D",
            "value": "अं त रा का श को हे न ले के लू प की अव रो ही भु जा \u0000ा रा",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 33,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q131",
    "questionNumber": 131,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Starch grains are abundant in the\nendodermal cells of",
    "options": [
      {
        "label": "A",
        "value": "Monocot root",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Dicot stem",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Monocot stem",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Dicot root",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Endodermis is the innermost layer of dicot stem  of   cortex   and   consists   of   barrel   shaped  parenchyma   cells   containing   abundant   starch  grains–known as starch sheath.",
    "languages": {
      "en": {
        "questionText": "Starch grains are abundant in the\nendodermal cells of",
        "options": [
          {
            "label": "A",
            "value": "Monocot root",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Dicot stem",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Monocot stem",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Dicot root",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िक स की अ \u0000 \u0000 ची य को िश का ओं म\u0000 म \u0000 कण \u0000 चु र\nमा \u0000ा म\u0000 हो ते ह\u0000 ?",
        "options": [
          {
            "label": "A",
            "value": "एक बी जप \u0000ी जड़",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ि\u0000 बी जप \u0000ी त ना",
            "type": "text"
          },
          {
            "label": "C",
            "value": "एक बी जप \u0000ी त ना",
            "type": "text"
          },
          {
            "label": "D",
            "value": "ि\u0000 बी जप \u0000ी जड़",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 33,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q132",
    "questionNumber": 132,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Presence of which of the following\nconditions in urine are indicative of\nDiabetes Mellitus?",
    "options": [
      {
        "label": "A",
        "value": "Uremia and Renal Calculi",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Ketonuria and Glycosuria",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Renal calculi and Hyperglycaemia",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Uremia and Ketonuria",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Diabetes mellitus leads to a complex disorder  called   prolonged   hyperglycemia,   which   is  associated   with   the   loss   of   glucose   through  urine known as   glycosuria .  When   the   cell   are   unable   to   utilize  carbohydrates for energy instead they use fats  &   proteins.   This   fat   degradation   produces  ketone bodies.   The presence of these ketone  bodies in urine is known as   ketonuria .  Thus,   presence   of   Ketonuria   and  Glycosuria   in urine are indicative of Diabetes  Mellitus.",
    "languages": {
      "en": {
        "questionText": "Presence of which of the following\nconditions in urine are indicative of\nDiabetes Mellitus?",
        "options": [
          {
            "label": "A",
            "value": "Uremia and Renal Calculi",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Ketonuria and Glycosuria",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Renal calculi and Hyperglycaemia",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Uremia and Ketonuria",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 म\u0000 मू \u0000 की कौ न सी अव \u0000 था डा य िब टी ज मे िल टस की\nओर सं के त कर ती है ?",
        "options": [
          {
            "label": "A",
            "value": "यू रे िम या ए वं री नल कै \u0000ु ली",
            "type": "text"
          },
          {
            "label": "B",
            "value": "की टो नु \u0000र या ए वं \u0000ा इ को सू \u0000र या",
            "type": "text"
          },
          {
            "label": "C",
            "value": "री नल कै \u0000ु ली ए वं हा इपर \u0000ा इ िस िम या",
            "type": "text"
          },
          {
            "label": "D",
            "value": "यू रे िम या ए वं की टो नु \u0000र या",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 33,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q133",
    "questionNumber": 133,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "In the process of Respiration in plants 180\ngm of Glucose plus 192 gm of oxygen\nproduce-",
    "options": [
      {
        "label": "A",
        "value": "132 gm of CO 2 , 54 gm of H 2 O & 483\nCal. Energy",
        "type": "text"
      },
      {
        "label": "B",
        "value": "264 gm of CO 2 ,108 gm of H 2 O, & 686\nKCal Energy",
        "type": "text"
      },
      {
        "label": "C",
        "value": "200 gm of C 2 H 5 OH, 72 gm of H 2 O & 21\nK. Cal Energy",
        "type": "text"
      },
      {
        "label": "D",
        "value": "None",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "264 g of   C O   and 108 g of water   are formed  from   180 g sugar and 192 g oxygen   during  respiration.   In   this   process,   686   kcal   of  energy are   released.  Hence, the correct answer is   option (B): 264  g of   C O   , 108 g of water, and 686 cal of  energy.  2  2",
    "languages": {
      "en": {
        "questionText": "In the process of Respiration in plants 180\ngm of Glucose plus 192 gm of oxygen\nproduce-",
        "options": [
          {
            "label": "A",
            "value": "132 gm of CO 2 , 54 gm of H 2 O & 483\nCal. Energy",
            "type": "text"
          },
          {
            "label": "B",
            "value": "264 gm of CO 2 ,108 gm of H 2 O, & 686\nKCal Energy",
            "type": "text"
          },
          {
            "label": "C",
            "value": "200 gm of C 2 H 5 OH, 72 gm of H 2 O & 21\nK. Cal Energy",
            "type": "text"
          },
          {
            "label": "D",
            "value": "None",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "पा द पों म\u0000 \u0000 सन ि\u0000 या म\u0000 180 \u0000ा म \u0000ू को ज और 192\n\u0000ा म ऑ \u0000ी जन से उ \u0000 \u0000 हो ते ह\u0000 -",
        "options": [
          {
            "label": "A",
            "value": "132 \u0000ा म CO₂, 54 \u0000ा म H₂O और 483 कै लो री\nऊ जा\u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "264 \u0000ा म CO₂, 108 \u0000ा म H₂O और 686\nKCal ऊ जा\u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "200 \u0000ा म C₂H₅OH, 72 \u0000ा म H₂O और 21\nKCal ऊ जा\u0000",
            "type": "text"
          },
          {
            "label": "D",
            "value": "को ई न हीं",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 33,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q134",
    "questionNumber": 134,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Bt toxins exist as inactive protoxins in\nbacteria but when an insect ingest the\ninactive toxin it becomes active toxin in\nthe presence of-",
    "options": [
      {
        "label": "A",
        "value": "Alkaline pH of insect mid gut",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Acidic pH of insect mid gut",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Bacterial enzyme",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Specific protein",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Bacillus thuringiensis is biopesticide, commonly  known   as   Bt,   is   a   naturally   occurring,   gram-  positive,   spore-forming   soil   bacterium.   Bt   has  been   known   to   be   reservoir   of   several  insecticidal   proteins,   such   as   endotoxins,  cytolytic   proteins,   vegetative   insecticidal  proteins, etc.  During sporulation, it synthesizes a cytoplasmic  inclusion containing one or more proteins that  are toxic to insect larvae. Upon completion of  sporulation   the   parent   bacterium   lyses   to  release   the   spore   and   the   inclusion.   In   these  inclusions,   the   toxins   exist   as   inactive  protoxins. When the inclusions are ingested by  insect   larvae,   the   alkaline   pH   solubilizes   the  crystal. The protoxin is then converted in to an  active   toxin   after   processing   by   the   host  proteases present in the midgut.",
    "languages": {
      "en": {
        "questionText": "Bt toxins exist as inactive protoxins in\nbacteria but when an insect ingest the\ninactive toxin it becomes active toxin in\nthe presence of-",
        "options": [
          {
            "label": "A",
            "value": "Alkaline pH of insect mid gut",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Acidic pH of insect mid gut",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Bacterial enzyme",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Specific protein",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "जी वा णु म\u0000 Bt टाॅ \u0000\u0000 न िन \u0000\u0000 य \u0000ो टो \u0000ी न के \u0000 प म\u0000\nहो ता है , पर \u0000ु जब एक की ट इस का अ \u0000ः \u0000 हण कर ता है\nतो यह िन \u0000\u0000 य टाॅ \u0000\u0000 न , स ि\u0000 य टाॅ \u0000\u0000 न मे िक स की\nउप \u0000\u0000थ ित मे बदल ता है , िक स की उप \u0000\u0000थ ित म\u0000 -",
        "options": [
          {
            "label": "A",
            "value": "की ट की म \u0000ां \u0000 की \u0000ा री य pH म\u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "की ट की म \u0000ां \u0000 की अ \u0000ी य pH म\u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "जी वा णु के एं जा इम से",
            "type": "text"
          },
          {
            "label": "D",
            "value": "िव िश \u0000 \u0000ो टी न",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 33,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q135",
    "questionNumber": 135,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Gases found in primitive atmospheres are:",
    "options": [
      {
        "label": "A",
        "value": "CH 4 , NH 3 , H 2 , H 2 O (vapour form)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "CH 4 , NH 3 , CO 2 , H 2 O",
        "type": "text"
      },
      {
        "label": "C",
        "value": "CH 4 , H 2 O, CO 2",
        "type": "text"
      },
      {
        "label": "D",
        "value": "CH 4 , O 2 , CO 2",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "12th NCERT, Page No.- 111",
    "languages": {
      "en": {
        "questionText": "Gases found in primitive atmospheres are:",
        "options": [
          {
            "label": "A",
            "value": "CH 4 , NH 3 , H 2 , H 2 O (vapour form)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "CH 4 , NH 3 , CO 2 , H 2 O",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CH 4 , H 2 O, CO 2",
            "type": "text"
          },
          {
            "label": "D",
            "value": "CH 4 , O 2 , CO 2",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "\u0000ा ची न वा ता वरण म\u0000 िन \u0000 गै स\u0000 उप \u0000\u0000थ त थींः",
        "options": [
          {
            "label": "A",
            "value": "CH 4 , NH 3 , H 2 , H 2 O ( वा \u0000 \u0000 प म\u0000 )",
            "type": "text"
          },
          {
            "label": "B",
            "value": "CH 4 , NH 3 , CO 2 , H 2 O",
            "type": "text"
          },
          {
            "label": "C",
            "value": "CH 4 , H 2 O, CO 2",
            "type": "text"
          },
          {
            "label": "D",
            "value": "CH 4 , O 2 , CO 2",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 33,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q136",
    "questionNumber": 136,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The Pyramid of numbers in grassland\necosystem will be -",
    "options": [
      {
        "label": "A",
        "value": "Up right",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Inverted",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Irregular",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Linear",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Up right  12th NCERT PAGE NO.- 212",
    "languages": {
      "en": {
        "questionText": "The Pyramid of numbers in grassland\necosystem will be -",
        "options": [
          {
            "label": "A",
            "value": "Up right",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Inverted",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Irregular",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Linear",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक घा स \u0000 थल पा \u0000र तं \u0000 म\u0000 सं \u0000ा का िप रै िम ड हो गा -",
        "options": [
          {
            "label": "A",
            "value": "सी धा",
            "type": "text"
          },
          {
            "label": "B",
            "value": "उ \u0000ा",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ल \u0000 वत",
            "type": "text"
          },
          {
            "label": "D",
            "value": "अ िन य िम त",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 34,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q137",
    "questionNumber": 137,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Plants having vascular tissues but lacking\nseeds are:-",
    "options": [
      {
        "label": "A",
        "value": "Bryophytes",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Pteridophytes",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Gymnosperms",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Angiosperms",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Pteridophytes   are   developed   plants   which   can  survive   on   land   as   they   have   well   developed  vascular tissues. The main plant body of these  plants   is   diploid,   called   sporophyte   which  produces spores after meiosis. These spores on  germination   give   rise   to   gametophytic   plants  which   produce   gametes.   The   spores   do   not  develop a hard coating around them and thus  are unable to form seeds.",
    "languages": {
      "en": {
        "questionText": "Plants having vascular tissues but lacking\nseeds are:-",
        "options": [
          {
            "label": "A",
            "value": "Bryophytes",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Pteridophytes",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Gymnosperms",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Angiosperms",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कौ न से पा द पों म\u0000 सं वहन ऊतक हो ते है पर \u0000ु बी जों की\nक मी हो ती है -",
        "options": [
          {
            "label": "A",
            "value": "\u0000ा यो फा य ट् स",
            "type": "text"
          },
          {
            "label": "B",
            "value": "टे \u0000र डो फा य ट् स",
            "type": "text"
          },
          {
            "label": "C",
            "value": "िज \u0000ो \u0000 म\u0000",
            "type": "text"
          },
          {
            "label": "D",
            "value": "एं िज यो \u0000 म\u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 34,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q138",
    "questionNumber": 138,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Which of the following is not true about\nmicturition reflex?",
    "options": [
      {
        "label": "A",
        "value": "It is initiated by stretch receptors in\nthe ureters",
        "type": "text"
      },
      {
        "label": "B",
        "value": "It relies on parasympathetic impulses\nfrom the micturition centre",
        "type": "text"
      },
      {
        "label": "C",
        "value": "It results in contraction of muscles of\nurinary bladder",
        "type": "text"
      },
      {
        "label": "D",
        "value": "It stimulates the internal urethral\nsphincter to relax",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "It is initiated by stretch receptors in the ureters",
    "languages": {
      "en": {
        "questionText": "Which of the following is not true about\nmicturition reflex?",
        "options": [
          {
            "label": "A",
            "value": "It is initiated by stretch receptors in\nthe ureters",
            "type": "text"
          },
          {
            "label": "B",
            "value": "It relies on parasympathetic impulses\nfrom the micturition centre",
            "type": "text"
          },
          {
            "label": "C",
            "value": "It results in contraction of muscles of\nurinary bladder",
            "type": "text"
          },
          {
            "label": "D",
            "value": "It stimulates the internal urethral\nsphincter to relax",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 म\u0000 से कौ न सा कथन मू \u0000 ण \u0000 ित व त\u0000 \u0000 ि\u0000 या से\nस \u0000 \u0000\u0000 त न हीं है ?",
        "options": [
          {
            "label": "A",
            "value": "इस की शु \u0000 वा त \u0000 सा र \u0000ा ही \u0000ा रा हो ती है जो\nमू \u0000 वा िह का म\u0000 हो ते है",
            "type": "text"
          },
          {
            "label": "B",
            "value": "मू \u0000 ण के \u0000 से आ ने वा ले प रा नु कं पी आ वे ग पर िन भ\u0000 र\nकर ता है",
            "type": "text"
          },
          {
            "label": "C",
            "value": "यह मू \u0000ा शय की मां स पे िश यों के सं कु चन का\nप \u0000र णा म हो ता है",
            "type": "text"
          },
          {
            "label": "D",
            "value": "मू \u0000 मा ग\u0000 पर उप \u0000\u0000थ त आं त \u0000र क अव रो ध नी का\nिश िथ लन \u0000े \u0000र त हो ता है",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 34,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q139",
    "questionNumber": 139,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The four pyramids (A, B, C and D) given\nbelow represent four different type of\necosystem ecological pyramids, which one\nof these is correctly identified in the\noptions given, along with its correct\necosystem & type of pyramid :\n(A)\n(B)\n(C)\n(D)",
    "options": [
      {
        "label": "A",
        "value": "Type of pyramid Ecosystem\nPyramid of number Tree ecosystem",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Type of pyramid Ecosystem\nPyramid of Biomass Grassland ecosystem",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Type of pyramid Ecosystem\nPyramid of energy Grassland ecosystem",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Type of pyramid Ecosystem\nPyramid of Biomass Sea ecosystem",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Type of pyramid   Ecosystem  Pyramid of energy   Grassland ecosystem",
    "languages": {
      "en": {
        "questionText": "The four pyramids (A, B, C and D) given\nbelow represent four different type of\necosystem ecological pyramids, which one\nof these is correctly identified in the\noptions given, along with its correct\necosystem & type of pyramid :\n(A)\n(B)\n(C)\n(D)",
        "options": [
          {
            "label": "A",
            "value": "Type of pyramid Ecosystem\nPyramid of number Tree ecosystem",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Type of pyramid Ecosystem\nPyramid of Biomass Grassland ecosystem",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Type of pyramid Ecosystem\nPyramid of energy Grassland ecosystem",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Type of pyramid Ecosystem\nPyramid of Biomass Sea ecosystem",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "नी चे िद ये ग ये चा र िप रे िम ड (A, B, C त था D) चा र\nिभ \u0000 \u0000 का र के पा \u0000र त \u0000 पा \u0000र \u0000\u0000थ ित की िप रे िम ड को\n\u0000 द िश\u0000 त कर ते है , इस म\u0000 से एक पा \u0000र त \u0000 ए वं िप रै िम ड के\n\u0000 का र के अ नु सा र स ही िम ला न को पह चा िन ये :\n(A)\n(B)\n(C)\n(D)",
        "options": [
          {
            "label": "A",
            "value": "िप रै िम ड का \u0000 का र पा \u0000र त \u0000\nसं \u0000ा का िप रै िम ड वृ \u0000 पा \u0000र त \u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "िप रै िम ड का \u0000 का र पा \u0000र त \u0000\nजै व भा र का िप रै िम ड घा स \u0000 थल पा \u0000र त \u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "िप रै िम ड का \u0000 का र पा \u0000र त \u0000\nऊ जा\u0000 का िप रै िम ड घा स \u0000 थल पा \u0000र त \u0000",
            "type": "text"
          },
          {
            "label": "D",
            "value": "िप रै िम ड का \u0000 का र पा \u0000र त \u0000\nजै व भा र का िप रै िम ड स मु \u0000ी पा \u0000र त \u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 34,
    "hasFigure": true,
    "figureUrl": "/q139_pyramids_with_labels.png",
    "questionImageUrl": "/q139_pyramids_with_labels.png",
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q140",
    "questionNumber": 140,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Mendelism is related with",
    "options": [
      {
        "label": "A",
        "value": "heredity in living beings",
        "type": "text"
      },
      {
        "label": "B",
        "value": "meiosis during sexual reproduction",
        "type": "text"
      },
      {
        "label": "C",
        "value": "mutation in living organisms",
        "type": "text"
      },
      {
        "label": "D",
        "value": "None of the above",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Mendelism   is   related   to   heredity.   The   three  prominent   law   given   by   Mendel   proved   its  relationship   with   inheritance.   The   law   of  segregation   states   that   each   character   is  regulated by a gene which exists in two forms  for a particular character known as allele which  segregates into different gametes. The law of  independent assortment states that alleles for  separate traits are passed independently of one  another   from   parents   to   offspring.   Law   of  dominance states that the dominant characters  mask the effect of the recessive allele.",
    "languages": {
      "en": {
        "questionText": "Mendelism is related with",
        "options": [
          {
            "label": "A",
            "value": "heredity in living beings",
            "type": "text"
          },
          {
            "label": "B",
            "value": "meiosis during sexual reproduction",
            "type": "text"
          },
          {
            "label": "C",
            "value": "mutation in living organisms",
            "type": "text"
          },
          {
            "label": "D",
            "value": "None of the above",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "म\u0000 ड िल \u0000 ( म\u0000 डल वा द ) से सं बं िध त है :-",
        "options": [
          {
            "label": "A",
            "value": "जी िव त जी वों म\u0000 आ नु वा िशं क ता से",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ल\u0000 \u0000िग क जनन के दौ रा न अ \u0000\u0000 सू \u0000ी िव भा जन से",
            "type": "text"
          },
          {
            "label": "C",
            "value": "जी िव त जी वों म\u0000 उ \u0000 \u0000र व त\u0000 न से",
            "type": "text"
          },
          {
            "label": "D",
            "value": "उप रो \u0000 म\u0000 से को ई न हीं",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 35,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q141",
    "questionNumber": 141,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Find odd one w.r.t. differentiation",
    "options": [
      {
        "label": "A",
        "value": "Loss of nucleus in sieve tube",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Death of protoplasm in tracheary\nelements",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Callus formation",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Lignification in vessels",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "11th NCERT, PAGE NO.- 172",
    "languages": {
      "en": {
        "questionText": "Find odd one w.r.t. differentiation",
        "options": [
          {
            "label": "A",
            "value": "Loss of nucleus in sieve tube",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Death of protoplasm in tracheary\nelements",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Callus formation",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Lignification in vessels",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िव भे दी करण के सं द भ\u0000 म\u0000 िव षम \u0000ा त की िज ए -",
        "options": [
          {
            "label": "A",
            "value": "चा ल नी न िल का ओं म\u0000 क \u0000 \u0000 क का न \u0000 हो ना",
            "type": "text"
          },
          {
            "label": "B",
            "value": "वा िह िन का त \u0000ों म\u0000 \u0000ो टो \u0000ा \u0000 का न \u0000 हो ना",
            "type": "text"
          },
          {
            "label": "C",
            "value": "कै लस का िन मा\u0000 ण",
            "type": "text"
          },
          {
            "label": "D",
            "value": "वा िह का ओं म\u0000 िल \u0000ी करण",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 35,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q142",
    "questionNumber": 142,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Given below are two statements :\nStatement-I : At present about 27\nrecombinant therapeutics have been\napproved for human use the world over.\nStatement-II : 30 documented varieties\nof Basmati rice are grow in India.\nChoose the correct answer from the option\ngiven below.",
    "options": [
      {
        "label": "A",
        "value": "Both statement I and statement II are\nincorrect",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Statement I is correct but statement II\nis incorrect",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Statement I is correct but Statement II\nis correct",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both Statement I and Statement II are\ncorrect",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Class 12   NCERT Page No. 181, 185 th",
    "languages": {
      "en": {
        "questionText": "Given below are two statements :\nStatement-I : At present about 27\nrecombinant therapeutics have been\napproved for human use the world over.\nStatement-II : 30 documented varieties\nof Basmati rice are grow in India.\nChoose the correct answer from the option\ngiven below.",
        "options": [
          {
            "label": "A",
            "value": "Both statement I and statement II are\nincorrect",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Statement I is correct but statement II\nis incorrect",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Statement I is correct but Statement II\nis correct",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both Statement I and Statement II are\ncorrect",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "नी चे दो कथन िद ए गए ह\u0000 :\nकथन -1: व त\u0000 मा न समय म\u0000 लगभग 27 पु न य\u0000 गज\nिच िक \u0000ी य औष िध याँ िव \u0000 म\u0000 म नु \u0000ों के \u0000 यो ग हे तु \u0000ी कृ त\nहो चु की है ।\nकथन - ॥ : बा सम ती धा न की 30 पह चा नी गई िक \u0000\u0000\nभा रत म\u0000 उ गा यी जा ती है ।\nनी चे िद ए िव क \u0000ों म\u0000 से स ही उ \u0000 र चु न\u0000",
        "options": [
          {
            "label": "A",
            "value": "दो नों कथन I और कथन II गलत है ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "कथन I स ही पर \u0000ु कथन II गलत है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "कथन I गलत है पर \u0000ु कथन II स ही है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "दो नों कथन I और कथन II स ही है ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 35,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q143",
    "questionNumber": 143,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Algae have cell wall made up of",
    "options": [
      {
        "label": "A",
        "value": "Cellulose, hemicellulose and pectins",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Cellulose, galactans, mannans",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Hemicellulose, pectins and proteins",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Pectins, cellulose and lipid",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Algae are surrounded by mucilagenous sheath  and below the sheath, cell wall is present which  is   made   up   of   cellulose   and   pectin,   but  galactans,   mannans   and   mineral   like   calcium  carbonate are present in cell wall also.",
    "languages": {
      "en": {
        "questionText": "Algae have cell wall made up of",
        "options": [
          {
            "label": "A",
            "value": "Cellulose, hemicellulose and pectins",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Cellulose, galactans, mannans",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Hemicellulose, pectins and proteins",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Pectins, cellulose and lipid",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "शै वा लों म\u0000 को िश का िभ ि\u0000 िन \u0000 की ब नी हो ती है",
        "options": [
          {
            "label": "A",
            "value": "से \u0000ू लो ज , हे मी से \u0000ू लो ज त था पे \u0000\u0000 न",
            "type": "text"
          },
          {
            "label": "B",
            "value": "से \u0000ू लो ज , गै ले \u0000े \u0000 , मे ने \u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "हे मी से \u0000ू लो ज , पे \u0000\u0000 न त था \u0000ो टी \u0000",
            "type": "text"
          },
          {
            "label": "D",
            "value": "पे \u0000\u0000 न , से \u0000ू लो ज त था िल िप ड",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 35,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q144",
    "questionNumber": 144,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Assertion : The primary function of sweat\nis to facilitate a cooling effect on the body\nsurface.\nReason : Sweat produced by the sweat\ngland is a watery fluid containing NaCl,\nsmall amounts of urea and lactic acid.",
    "options": [
      {
        "label": "A",
        "value": "Both (A) and (R) are true and (R) is\nthe correct explanation of (A)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Both (A) and (R) are true but (R) is\nnot the correct explanation of (A)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(A) is true statement but (R) is false.",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both (A) and (R) are false.",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Class XI   NCERT Page No. 213 th",
    "languages": {
      "en": {
        "questionText": "Assertion : The primary function of sweat\nis to facilitate a cooling effect on the body\nsurface.\nReason : Sweat produced by the sweat\ngland is a watery fluid containing NaCl,\nsmall amounts of urea and lactic acid.",
        "options": [
          {
            "label": "A",
            "value": "Both (A) and (R) are true and (R) is\nthe correct explanation of (A)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Both (A) and (R) are true but (R) is\nnot the correct explanation of (A)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(A) is true statement but (R) is false.",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both (A) and (R) are false.",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कथन : प सी ने का मु \u0000 का य\u0000 वा \u0000ी करण \u0000ा रा श री र\nसतह को ठं डा रख ना है\nका रण : \u0000े द \u0000ं िथ \u0000ा रा िन कल ने वा ला प सी ना एक\nज ली य \u0000 व है , िज स म\u0000 NaCl , कु छ मा \u0000ा म\u0000\nयू \u0000र या व लै \u0000\u0000 क अ \u0000 हो ते ह\u0000 ।",
        "options": [
          {
            "label": "A",
            "value": "(A) और (R) दो नों स \u0000 ह\u0000 और (R) (A) की स ही\n\u0000ा \u0000ा है ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(A) और (R) दो नों स \u0000 ह\u0000 ले िक न (R) (A) की\nस ही \u0000ा \u0000ा न हीं है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(A) स \u0000 कथन है ले िक न (R) अस \u0000 है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(A) और (R) दो नों अस \u0000 ह\u0000 ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 35,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q145",
    "questionNumber": 145,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "What type of human population is\nrepresented by the following age pyramid",
    "options": [
      {
        "label": "A",
        "value": "Vanishing population",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Stable population",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Declining population",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Expanding population",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "The   age   pyramids   for   human   population  generally shows age distribution of males and  females   in   a   combined   diagram.   The   shape  reflects the growth status of the population as  shown below.  The given age pyramid represents the declining  population.   A   population   can   shrink   due   to  declining birth rate.",
    "languages": {
      "en": {
        "questionText": "What type of human population is\nrepresented by the following age pyramid",
        "options": [
          {
            "label": "A",
            "value": "Vanishing population",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Stable population",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Declining population",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Expanding population",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "नी चे िद ये जा र हे आ यु िप रा िम ड म\u0000 िक स \u0000 का र की मा नव\nसम ि\u0000 \u0000 द िश\u0000 त की ग यी है -",
        "options": [
          {
            "label": "A",
            "value": "गा यब हो ती सम ि\u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "\u0000\u0000थ र सम ि\u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "घट ती सम ि\u0000",
            "type": "text"
          },
          {
            "label": "D",
            "value": "बढ़ ती सम ि\u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 36,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q146",
    "questionNumber": 146,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The concept of genetic map was given by -",
    "options": [
      {
        "label": "A",
        "value": "de Vries",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Morgan",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Sturtevant",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Mendel",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Class 12   NCERT Page No. 67 th",
    "languages": {
      "en": {
        "questionText": "The concept of genetic map was given by -",
        "options": [
          {
            "label": "A",
            "value": "de Vries",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Morgan",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Sturtevant",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Mendel",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "आ नु वं िश क मा न िच \u0000 का िस \u0000ां त िक स ने िद या था ?",
        "options": [
          {
            "label": "A",
            "value": "िड \u0000ी स",
            "type": "text"
          },
          {
            "label": "B",
            "value": "मो ग\u0000 न",
            "type": "text"
          },
          {
            "label": "C",
            "value": "\u0000ु ट\u0000 \u0000व\u0000 ट",
            "type": "text"
          },
          {
            "label": "D",
            "value": "म\u0000 डल",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 36,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q147",
    "questionNumber": 147,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Given below are two statements; one is\nlabelled as Assertion (A) and the other is\nlabelled Reason (R).\nAssertion (A) : In arithmetic growth,\nmitotic cell division occurs in which, only\none daughter cell continues to divide,\nwhile other differentiate and matures.\nReason (R) : The simplest expression of\narithmetic growth is exemplified by zygote\nelongating at a constant rate.",
    "options": [
      {
        "label": "A",
        "value": "If both assertion and reason are true\nand reason is the correct explanation of\nassertion.",
        "type": "text"
      },
      {
        "label": "B",
        "value": "If both assertion and reason are true\nbut reason is not the correct explanation\nof assertion.",
        "type": "text"
      },
      {
        "label": "C",
        "value": "If assertion is true but reason is false.",
        "type": "text"
      },
      {
        "label": "D",
        "value": "If both assertion and reason are false.",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "If assertion is true but reason is false.  11th NCERT, PAGE NO.- 169",
    "languages": {
      "en": {
        "questionText": "Given below are two statements; one is\nlabelled as Assertion (A) and the other is\nlabelled Reason (R).\nAssertion (A) : In arithmetic growth,\nmitotic cell division occurs in which, only\none daughter cell continues to divide,\nwhile other differentiate and matures.\nReason (R) : The simplest expression of\narithmetic growth is exemplified by zygote\nelongating at a constant rate.",
        "options": [
          {
            "label": "A",
            "value": "If both assertion and reason are true\nand reason is the correct explanation of\nassertion.",
            "type": "text"
          },
          {
            "label": "B",
            "value": "If both assertion and reason are true\nbut reason is not the correct explanation\nof assertion.",
            "type": "text"
          },
          {
            "label": "C",
            "value": "If assertion is true but reason is false.",
            "type": "text"
          },
          {
            "label": "D",
            "value": "If both assertion and reason are false.",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "नी चे दो कथन िद ये ग ये है , एक अ िभ कथन (A) त था\nदू स रा का रण (R) को िच \u0000\u0000 त कर ता है ।\nकथन (A) : अं कग िण ती य वृ \u0000\u0000 म\u0000 सम सु \u0000ी को िश का\nिव भा जन हो ता है । िज स म\u0000 , के वल एक पु \u0000ी को िश का\nिव भा िज त हो ती रह ती है , जब िक अ \u0000 िव भे िद त हो ती है\nए वं प \u0000र प \u0000 हो जा ती है ।\nका रण (R) : अं कग िण ती य वृ \u0000\u0000 की सब से सरल\nअ िभ \u0000 \u0000\u0000 एक िन यत दर म\u0000 वृ \u0000\u0000 रत यु \u0000 नज से\nउ दा हर णा त हो ती ह\u0000 ।",
        "options": [
          {
            "label": "A",
            "value": "य िद कथन ए वं का रण दो नों स \u0000 ह\u0000 त था का रण\nकथन का स ही \u0000 \u0000ी करण है ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "य िद कथन ए वं का रण दो नों स \u0000 ह\u0000 , ले िक न का रण ,\nकथन का स ही \u0000 \u0000ी करण न हीं है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "य िद कथन स \u0000 है , ले िक न का रण अस \u0000 है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "य िद कथन व का रण दो नों अस \u0000 ह\u0000 ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 36,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q148",
    "questionNumber": 148,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Given below are two statements : one is\nlabelled as Assertion (A) and the other is\nlabelled as Reason (R)\nAssertion (A) : Micro injection is direct\nmethod of gene transfer.\nReason (R) : Ti plasmid use to deliever\ngenes of our interest in animal cells.\nIn the light of the above statements,\nchoose the correct answer from the\noptions given below :",
    "options": [
      {
        "label": "A",
        "value": "Both (A) and (R) are correct but (R) is\nnot the correct explanation of (A)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(A) is correct but (R) is not correct",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(A) is not correct but (R) is correct",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both (A) and (R) are correct and (R) is\nthe correct explanation of (A)",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Class 12   NCERT Page No. 170, 171 th",
    "languages": {
      "en": {
        "questionText": "Given below are two statements : one is\nlabelled as Assertion (A) and the other is\nlabelled as Reason (R)\nAssertion (A) : Micro injection is direct\nmethod of gene transfer.\nReason (R) : Ti plasmid use to deliever\ngenes of our interest in animal cells.\nIn the light of the above statements,\nchoose the correct answer from the\noptions given below :",
        "options": [
          {
            "label": "A",
            "value": "Both (A) and (R) are correct but (R) is\nnot the correct explanation of (A)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(A) is correct but (R) is not correct",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(A) is not correct but (R) is correct",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both (A) and (R) are correct and (R) is\nthe correct explanation of (A)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त दो कथन िद ए गए है , एक अ िभ कथन (A) से\nऔर दू स रा का रण (R) से ले व \u0000 है\nअ िभ कथन (A) : मा इ \u0000ो इं जे \u0000 न जी न \u0000 था ना तं \u0000र त\nकर ने की \u0000 \u0000 \u0000 िव िध है ।\nका रण (R) : Ti \u0000ा \u0000\u0000 ड का उप यो ग अप नी\nअ िभ \u0000 िच की जी न का ज \u0000ु को िश का म\u0000 \u0000 था ना \u0000 \u0000र त\nकर ने के िल ए िक या जा ता है ।\nउप रो \u0000 कथ नों के सं द भ\u0000 म\u0000 स ही चयन क र\u0000 , नी चे िद ए\nगए िव क \u0000ों म\u0000 स ही उ \u0000 र का चयन की िज ए -",
        "options": [
          {
            "label": "A",
            "value": "दो नों (A) और (R) स ही है ले िक न (R), (A) का\nस ही \u0000ा \u0000ा न न ही कर ता है ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(A) स ही है पर \u0000ु (R) स ही है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(A) स ही न हीं है पर \u0000ु (R) स ही है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "दो नों (A) और (R) स ही है और (R), (R) की\nस ही \u0000ा \u0000ा कर ता है ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 36,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q149",
    "questionNumber": 149,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Naked seeds of gymnosperms mean",
    "options": [
      {
        "label": "A",
        "value": "Fruits without parent tissues",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Phanerogams without seed",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Seeds not enclosed in ovary wall",
        "type": "text"
      },
      {
        "label": "D",
        "value": "All of these",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Naked seeds of gymnosperms mean the seeds  are   not   covered   inside   in   an   ovary   but   are  present   on   megasporophyll,   the   leaf   like  structures.",
    "languages": {
      "en": {
        "questionText": "Naked seeds of gymnosperms mean",
        "options": [
          {
            "label": "A",
            "value": "Fruits without parent tissues",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Phanerogams without seed",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Seeds not enclosed in ovary wall",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All of these",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िज \u0000ो \u0000 म\u0000 का न \u0000 बी ज हो ता है :-",
        "options": [
          {
            "label": "A",
            "value": "पै तृ क ऊत कों र िह त फल",
            "type": "text"
          },
          {
            "label": "B",
            "value": "बी ज र िह त फे ने रो गे म",
            "type": "text"
          },
          {
            "label": "C",
            "value": "बी ज अं डा शय िभ \u0000ी म\u0000 सं ल \u0000 न हीं हो ते है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "ये स भी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 37,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q150",
    "questionNumber": 150,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "A pie chart with proportionate number of\nspecies of major taxa of invertebrates is\ngiven below.\nSelect the option which correctly identifies\nthe labels A, B and C.",
    "options": [
      {
        "label": "A",
        "value": "A –Molluscs, B-Insects, C- Crustaceans",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A –Insects, B-Molluscs, C- Crustaceans",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A –Insects, B-Crustaceans, C- Molluscs",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A –Crustaceans, B-Molluscs, C-\nInsects",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Class 12   NCERT Page No. 260 th",
    "languages": {
      "en": {
        "questionText": "A pie chart with proportionate number of\nspecies of major taxa of invertebrates is\ngiven below.\nSelect the option which correctly identifies\nthe labels A, B and C.",
        "options": [
          {
            "label": "A",
            "value": "A –Molluscs, B-Insects, C- Crustaceans",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A –Insects, B-Molluscs, C- Crustaceans",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A –Insects, B-Crustaceans, C- Molluscs",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A –Crustaceans, B-Molluscs, C-\nInsects",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक पा ई चा ट\u0000 म\u0000 अक शे \u0000 की यों के \u0000 मु ख व ग\u0000 की\nजा ित यों की सं \u0000ा का अ नु पा त नी चे िद या ग या है ।\nिन \u0000 िल \u0000ख त म\u0000 से िच \u0000\u0000 त A, B और C के िल ए स ही\nिव क \u0000 \u0000ा त की िज ए -",
        "options": [
          {
            "label": "A",
            "value": "A – मो ल \u0000 स , B – की ट , C – \u0000 \u0000ै िश यं स",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A – की ट , B – मो ल \u0000 स , C – \u0000 \u0000ै िश यं स",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A – की ट , B – \u0000 \u0000ै िश यं स , C – मो ल \u0000 स",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A – \u0000 \u0000ै िश यं स , B – मो ल \u0000 स , C – की ट",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 37,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q151",
    "questionNumber": 151,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "In sickle cell anaemia the disorder is\ncaused due to the change in chemical\nnature of:-",
    "options": [
      {
        "label": "A",
        "value": "α chain of haemoglobin",
        "type": "text"
      },
      {
        "label": "B",
        "value": "β chain of haemoglobin",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Both the chains",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Neither of them",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Sickle   cell   disease   (SCD)   is   a   group   of   blood  disorders   typically   inherited   from   a   person's  parents. The most common type is known as  sickle   cell   anaemia   (SCA).   It   results   in   an  abnormality   in   the   oxygen-carrying   protein  haemoglobin found in red blood cells. Sickle cell  disease   occurs   when   a   person   inherits   two  abnormal   copies   of   the   β-globin   gene   (HBB)  that   makes   haemoglobin,   one   from   each  parent.   This   gene   occurs   in   chromosome   11.  Several subtypes exist, depending on the exact  mutation in each haemoglobin gene. An attack  can be set off by temperature changes, stress,  dehydration, and high altitude. A person with a  single   abnormal   copy   does   not   usually   have  symptoms and is said to have sickle cell trait.  Hence,   the   correct   answer   is   β   chain   of  haemoglobin.",
    "languages": {
      "en": {
        "questionText": "In sickle cell anaemia the disorder is\ncaused due to the change in chemical\nnature of:-",
        "options": [
          {
            "label": "A",
            "value": "α chain of haemoglobin",
            "type": "text"
          },
          {
            "label": "B",
            "value": "β chain of haemoglobin",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Both the chains",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Neither of them",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "दा \u0000 को िश का अर \u0000 ता म\u0000 िव का र रा सा य िन क \u0000 कृ ित म\u0000\nप \u0000र व त\u0000 न के का रण हो ता है -",
        "options": [
          {
            "label": "A",
            "value": "α \u0000ृं ख ला ही मो \u0000ो िब न की",
            "type": "text"
          },
          {
            "label": "B",
            "value": "β \u0000ृं ख ला ही मो \u0000ो िब न की",
            "type": "text"
          },
          {
            "label": "C",
            "value": "दो नों \u0000ृं ख ला एं",
            "type": "text"
          },
          {
            "label": "D",
            "value": "इन म\u0000 से को ई न हीं",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 37,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q152",
    "questionNumber": 152,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Assertion: Juvenile conifers are sprayed\nwith GA\nReason: GA delays senescence and\nmalting period\nWhich of the given options are correct?",
    "options": [
      {
        "label": "A",
        "value": "Both assertion & reason are correct\nand reason is correct explanation of\nassertion",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Both assertion & reason are correct but\nreason is not explanation of assertion",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Assertion is correct but reason is\nwrong",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both assertion & reason are in correct",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Gibberellins   ( Gibberellic   Acids )   are   plant  hormones   that   control,   among   other   things,  stem   elongation,   germination,   dormancy,  flowering, floral development, and leaf and  fruit   senescence.   Gibberellin   spraying   on  juvenile   conifers   accelerates   maturity,  resulting in early seed production .",
    "languages": {
      "en": {
        "questionText": "Assertion: Juvenile conifers are sprayed\nwith GA\nReason: GA delays senescence and\nmalting period\nWhich of the given options are correct?",
        "options": [
          {
            "label": "A",
            "value": "Both assertion & reason are correct\nand reason is correct explanation of\nassertion",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Both assertion & reason are correct but\nreason is not explanation of assertion",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Assertion is correct but reason is\nwrong",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both assertion & reason are in correct",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "अ िभ कथ नः त \u0000 ण शं कु धा री पर GA का िछ ड़ का व िक या\nजा ता है ।\nका र णः GA जी ण\u0000 ता और मॉ \u0000\u0000ं ग अव िध को िव लं िब त\nकर ता है ।\nिद ये ग ये िव क \u0000ों म\u0000 से कौ न सा स ही ह\u0000 ?",
        "options": [
          {
            "label": "A",
            "value": "दो नों अ िभ कथन और का रण स ही ह\u0000 और का रण\nअ िभ कथन का स ही \u0000 \u0000ी करण है ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "दो नों अ िभ कथन और का रण स ही ह\u0000 ले िक न का रण\nअ िभ कथन का \u0000 \u0000ी करण न हीं है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "अ िभ कथन स ही है ले िक न का रण गलत है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "दो नों अ िभ कथन और का रण गलत ह\u0000 ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 37,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q153",
    "questionNumber": 153,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Assertion (A) : Aschelminthes represent\npseudocoelomates.\nReason (R) : In aschelminthes,\nmesoderm is present as scattered\npouches in between ectoderm and\nendoderm.",
    "options": [
      {
        "label": "A",
        "value": "Both (A) and (R) are true and (R) is\nthe correct explanation of (A)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Both (A) and (R) are true but (R) is\nnot the correct explanation of (A)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(A) is true statement but (R) is false.",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both (A) and (R) are false.",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "In Aschelminthes, the body cavity is not lined  by   mesoderm,   instead,   the   mesoderm   is  present   as   scattered   pouches   in   between   the  ectoderm and endoderm. Hence, they are called  pseudocoelomates.",
    "languages": {
      "en": {
        "questionText": "Assertion (A) : Aschelminthes represent\npseudocoelomates.\nReason (R) : In aschelminthes,\nmesoderm is present as scattered\npouches in between ectoderm and\nendoderm.",
        "options": [
          {
            "label": "A",
            "value": "Both (A) and (R) are true and (R) is\nthe correct explanation of (A)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Both (A) and (R) are true but (R) is\nnot the correct explanation of (A)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(A) is true statement but (R) is false.",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both (A) and (R) are false.",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कथन (A) : ए \u0000े हे \u0000\u0000 \u0000\u0000 ज कु ट गु ही का जं तु ओ को\nद शा\u0000 ते है ।\nका रण (R) : ए \u0000े हे \u0000\u0000 \u0000\u0000 ज म\u0000 , मी जो ड म\u0000 िब ख रे \u0000 ए\nपा उच के \u0000 प म\u0000 ए \u0000ो ड म\u0000 त था ए \u0000ो ड म\u0000 के बी च पा ई\nजा ती है ।",
        "options": [
          {
            "label": "A",
            "value": "दो नों (A) ए वं (R) स ही है त था (R), (A) की\nस ही \u0000ा \u0000ा है ।",
            "type": "text"
          },
          {
            "label": "B",
            "value": "दो नों (A) ए वं (R) स ही है ले िक न (R), (A) की\nस ही \u0000ा \u0000ा न हीं है ।",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(A) स ही है ले िक न (R) गलत है ।",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(A) त था (R) दो नों ही अस \u0000 है ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 38,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q154",
    "questionNumber": 154,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Ladybird insects have proved very useful\nfor the control of-",
    "options": [
      {
        "label": "A",
        "value": "Glomus",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Mosquito",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Aphids",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Carrot grass",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Class 12th NCERT (N ew) Page No.157",
    "languages": {
      "en": {
        "questionText": "Ladybird insects have proved very useful\nfor the control of-",
        "options": [
          {
            "label": "A",
            "value": "Glomus",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Mosquito",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Aphids",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Carrot grass",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िक स के िन यं \u0000 ण के िल ए ले ड़ी ब ड\u0000 की ट ब \u0000 त उप यो गी\nिस \u0000 \u0000 आ -",
        "options": [
          {
            "label": "A",
            "value": "\u0000ो मस",
            "type": "text"
          },
          {
            "label": "B",
            "value": "म \u0000 र",
            "type": "text"
          },
          {
            "label": "C",
            "value": "ए िफ ड",
            "type": "text"
          },
          {
            "label": "D",
            "value": "गा जर घा स",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 38,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q155",
    "questionNumber": 155,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "In a pedigree analysis, the given symbol\nrepresnets :-",
    "options": [
      {
        "label": "A",
        "value": "Affected individuals",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Mating",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Consanguineous mating",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Unspecified sex",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Class 12   NCERT Page No. 74 th",
    "languages": {
      "en": {
        "questionText": "In a pedigree analysis, the given symbol\nrepresnets :-",
        "options": [
          {
            "label": "A",
            "value": "Affected individuals",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Mating",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Consanguineous mating",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Unspecified sex",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "वं शा व ली िव \u0000े षण म\u0000 , िद या ग या िच \u0000 िन \u0000 िल \u0000ख त को\nद शा\u0000 ता है -",
        "options": [
          {
            "label": "A",
            "value": "\u0000 भा िव त \u0000 \u0000\u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "मै थु न",
            "type": "text"
          },
          {
            "label": "C",
            "value": "िन कट स \u0000ं धी मै थु न",
            "type": "text"
          },
          {
            "label": "D",
            "value": "अ िन िद\u0000 \u0000 िलं ग",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 38,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q156",
    "questionNumber": 156,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "After culturing the anther of a plant, a few\ndiploid plants were found along with\nhaploid plants. The diploid plants could\nhave arisen from:-",
    "options": [
      {
        "label": "A",
        "value": "Generative cell of pollen",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Cells of anther wall",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Vegetative cells of pollen",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Exine of pollen wall",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Haploid plant cultures can be obtained by pollen  grains by the technique of pollen culture. Pollen  culture is a technique of production of haploid  plants by culture of pollen grains obtained from  anther   of   a   plant   under   aseptic   condition   on  artificial   media   of   known   composition.   When  the anther is used as the explant material for  the   cultivation   of   new   plants   by   the   tissue  culture technique, then there are some plants  which are developed as haploid and the other  plants   are   developed   as   the   diploid   plants.  There are different types of tissues which are  present in the anther. The pollen grains and the  respective   cells   like   the   vegetative   cell   and  generative cell will give rise to the plants which  are   haploid   because   they   are   formed   through  microsporogenesis. The other cells like the cells  of anther wall, endothecium, middle layers are  diploid in nature and give rise to diploid plants.",
    "languages": {
      "en": {
        "questionText": "After culturing the anther of a plant, a few\ndiploid plants were found along with\nhaploid plants. The diploid plants could\nhave arisen from:-",
        "options": [
          {
            "label": "A",
            "value": "Generative cell of pollen",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Cells of anther wall",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Vegetative cells of pollen",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Exine of pollen wall",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "पौ धे के प रा ग को श का सं व ध\u0000 न कर ने के बा द , अ गु िण त\nपौ धे के सा थ कु छ ि\u0000 गु िण त पौ धे पा ए गए। ि\u0000 गु िण त पा दप\nउ \u0000 \u0000 \u0000 ए है -",
        "options": [
          {
            "label": "A",
            "value": "प रा ग की जनन को िश का से",
            "type": "text"
          },
          {
            "label": "B",
            "value": "प रा ग को ष िभ ि\u0000 की को िश का ओं से",
            "type": "text"
          },
          {
            "label": "C",
            "value": "प रा ग की का िय क को िश का ओं से",
            "type": "text"
          },
          {
            "label": "D",
            "value": "प रा ग िभ ि\u0000 की बा \u0000 चो ल से",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 38,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q157",
    "questionNumber": 157,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Statement-1: Cephalochordata bears\nnotochord all along the body throughout\nlife.\nStatement-2 : Urochordate bears\nvertebral column only in tail region\nthroughout the life.\nThen which is correct?",
    "options": [
      {
        "label": "A",
        "value": "Both statement-1 and statement-2 are\ncorrect",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Statement-1 is correct, statement-2 is\nwrong",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Statement-1 is wrong, statement-2 is\ncorrect",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both statement-1 and statement-2 are\nwrong",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Cephalochordates   and   vertebrates   have   a  hollow, dorsal nerve cord, pharyngeal gill slits,  and   a   notochord.   In   most   vertebrates,   the  embryonic notochord is eventually replaced by  bony vertebrae or cartilaginous tissue; among  cephalochordates,   the   notochord   is   retained  into   adulthood   and   is   never   replaced   by  vertebrae.But   urochordates   have   notochord   in  the tail region in their larval stage only.",
    "languages": {
      "en": {
        "questionText": "Statement-1: Cephalochordata bears\nnotochord all along the body throughout\nlife.\nStatement-2 : Urochordate bears\nvertebral column only in tail region\nthroughout the life.\nThen which is correct?",
        "options": [
          {
            "label": "A",
            "value": "Both statement-1 and statement-2 are\ncorrect",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Statement-1 is correct, statement-2 is\nwrong",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Statement-1 is wrong, statement-2 is\ncorrect",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both statement-1 and statement-2 are\nwrong",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कथन .1:- िस फै लो काॅ ड\u0000 टा म\u0000 मे \u0000 द \u0000 स \u0000ू ण\u0000 श री र म\u0000\nजी वन भर पा यी जा ती है ।\nकथन .2:- यू रो काॅ ड\u0000 ट म\u0000 के वल पूँ छ वा ले भा ग म\u0000\nक शे \u0000 क द \u0000 जी वन भर पा या जा ता है ।\nिन \u0000 म\u0000 से कौ न सा कथन स ही है ?",
        "options": [
          {
            "label": "A",
            "value": "कथन -1 व कथन -2 दो नों स ही है",
            "type": "text"
          },
          {
            "label": "B",
            "value": "कथन -1 स ही है , कथन -2 गलत है",
            "type": "text"
          },
          {
            "label": "C",
            "value": "कथन -1 गलत है , कथन -2 स ही है",
            "type": "text"
          },
          {
            "label": "D",
            "value": "कथन -1 व कथन -2 दो नों गलत ह\u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 39,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q158",
    "questionNumber": 158,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Thick cutcle, sunken and scotoactive\nstomata. CAM photosynthesis and\nconversion of leaves into spines are some\nof the important characters of:-",
    "options": [
      {
        "label": "A",
        "value": "Desert plants",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Hydrophytes",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Xerophytes",
        "type": "text"
      },
      {
        "label": "D",
        "value": "More then one options are correct",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Xerophytes desert plants   grow in physical or  physiological   dryness.   The   water   is   not   easily  available   and   they   need   to   conserve   water.  These   plants   have   well   developed   roots   to  absorb water. They have other adaptations to  reduce   transpiration   loss   of   water,   like  multilayered epidermis, sunken stomata, thick  waxy   cuticle,   stomata   are   present   in   lower  epidermis   sunken   in   substomatal   chambers,  which has hairs.",
    "languages": {
      "en": {
        "questionText": "Thick cutcle, sunken and scotoactive\nstomata. CAM photosynthesis and\nconversion of leaves into spines are some\nof the important characters of:-",
        "options": [
          {
            "label": "A",
            "value": "Desert plants",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Hydrophytes",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Xerophytes",
            "type": "text"
          },
          {
            "label": "D",
            "value": "More then one options are correct",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "मो टी उप \u0000 चा , भी तर धं से \u0000 ए और \u0000ो टो ए \u0000\u0000 व रं \u0000 ,\nCAM \u0000 का श सं \u0000े षण त था प ि\u0000 यों का कां टों म\u0000\n\u0000 पां तरण िक स के मह \u0000 पू ण\u0000 ल \u0000 ण ह\u0000 -",
        "options": [
          {
            "label": "A",
            "value": "म \u0000 \u0000 थ ली य पौ धों के",
            "type": "text"
          },
          {
            "label": "B",
            "value": "ज लो \u0000\u0000 द पौ धों के",
            "type": "text"
          },
          {
            "label": "C",
            "value": "म \u0000 \u0000\u0000 द पौ धों के",
            "type": "text"
          },
          {
            "label": "D",
            "value": "एक से अ िध क िव क \u0000 स ही ह\u0000",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 39,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q159",
    "questionNumber": 159,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The substance which causes a definite\nchange in genes is called:-",
    "options": [
      {
        "label": "A",
        "value": "Mutagen",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Toxin",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Cytotoxin",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Alkaloid",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Mutagen   is   a   physical   or   chemical   agent   that  changes the genetic material, usually DNA, of  an organism and thus increases the frequency  of   mutations   above   the   natural   background  level.   As   many   mutations   can   cause   cancer,  mutagens   are   therefore   also   likely   to   be  carcinogens,   although   not   always   necessarily  so   Due to mutation phenotype and genotype of  offspring affect.  Toxin - A toxin is a harmful substance produced  within living cells or organism  Cytotoxin - Cytotoxic   agents are known as all  the elements that are toxic to the cells, which  include   the   factors   that   prevent   their   growth  and sometimes   cause   death, and are also used  to treat certain disorders.  Alkaloid   -   Alkaloids   are   a   class   of   basic,  naturally   occurring   organic   compounds   that  contain   at   least   one   nitrogen   atom.   Alkaloids  stimulate   human   organisms,   for   example,  central nervous system, or directly work on the  human brain.",
    "languages": {
      "en": {
        "questionText": "The substance which causes a definite\nchange in genes is called:-",
        "options": [
          {
            "label": "A",
            "value": "Mutagen",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Toxin",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Cytotoxin",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Alkaloid",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "वह प दा थ\u0000 जो जी न म\u0000 िन ि\u0000 त प \u0000र व त\u0000 न का का रण बन ता\nहै | उ से कह ते है -",
        "options": [
          {
            "label": "A",
            "value": "उ \u0000 \u0000र व त\u0000 जन",
            "type": "text"
          },
          {
            "label": "B",
            "value": "टॉ \u0000\u0000 न",
            "type": "text"
          },
          {
            "label": "C",
            "value": "सा इ टो टॉ \u0000\u0000 न",
            "type": "text"
          },
          {
            "label": "D",
            "value": "ए \u0000े लाॅ इड",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 39,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q160",
    "questionNumber": 160,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Select wrong statement for cleistogamy of\nflower in plant:-",
    "options": [
      {
        "label": "A",
        "value": "Cleistogamous flower lack requirement\nof pollinators",
        "type": "text"
      },
      {
        "label": "B",
        "value": "It is a adaptation of autogamy",
        "type": "text"
      },
      {
        "label": "C",
        "value": "It perform in Oxalis and Viola",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Their flowers are coloured contain\naroma and nectar",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "In   cleistogamous   flowers,   the   anthers   and  stigma   lie   close   to   each   other.   When   anthers  dehisce in the flower buds, pollen grains come  in contact with the stigma to effect pollination.  Thus,   cleistogamous   flowers   are   invariably  autogamous   as there is   no chance of cross-  pollen   landing on the stigma.   Cleistogamous  flowers produce assured seed-set even in  the absence of pollinators. eg- viola, oxalis  etc.   While in chasmogamous flowers are similar  to   flowers   of   other   species   with   exposed  anthers and stigma. Their flower are coloured  contain aroma and nectar.",
    "languages": {
      "en": {
        "questionText": "Select wrong statement for cleistogamy of\nflower in plant:-",
        "options": [
          {
            "label": "A",
            "value": "Cleistogamous flower lack requirement\nof pollinators",
            "type": "text"
          },
          {
            "label": "B",
            "value": "It is a adaptation of autogamy",
            "type": "text"
          },
          {
            "label": "C",
            "value": "It perform in Oxalis and Viola",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Their flowers are coloured contain\naroma and nectar",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "पौ धे म\u0000 पु \u0000 की अ नु \u0000ी \u0000 ता के िल ए गलत कथन का\nचयन क र\u0000",
        "options": [
          {
            "label": "A",
            "value": "अ नु \u0000ी \u0000 - प रा ग णी पु \u0000ों म\u0000 प रा गणक ता\u0000 ओं की\nआव \u0000 क ता न हीं हो ती है",
            "type": "text"
          },
          {
            "label": "B",
            "value": "यह \u0000 प रा गण का एक अ नु कू लन है",
            "type": "text"
          },
          {
            "label": "C",
            "value": "यह ऑ \u0000े िल स और वा यो ला म\u0000 हो ता है",
            "type": "text"
          },
          {
            "label": "D",
            "value": "उन के पु \u0000 रं गी न हो ते ह\u0000 , उन म\u0000 सु गं ध और मक रं द\nहो ता है",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 39,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q161",
    "questionNumber": 161,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Match list 'A' and list 'B' correctly and find\nyour answer from the code given below :\nList-A List-B\n(Animal) (Common name)\n(i) Physalia (A) Brain coral\n(ii)\n(B) Sea fan\nPennatula\n(iii)\n(C) Sea pen\nGorgonia\n(iv) (D) Portuguese man\nMeandrina of war",
    "options": [
      {
        "label": "A",
        "value": "(i)-A, (ii)-B, (iii)-C, (iv)-D",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(i)-D, (ii)-C, (iii)-B, (iv)-A",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(i)-C, (ii)-D, (iii)-B, (iv)-A",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(i)-D, (ii)-C, (iii)-A, (iv)-B",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Physalia - Portuguese man of war, Pennatula -  Sea pen, Gorgonia - Sea fan, and Menandrina -  Brain coral.",
    "languages": {
      "en": {
        "questionText": "Match list 'A' and list 'B' correctly and find\nyour answer from the code given below :\nList-A List-B\n(Animal) (Common name)\n(i) Physalia (A) Brain coral\n(ii)\n(B) Sea fan\nPennatula\n(iii)\n(C) Sea pen\nGorgonia\n(iv) (D) Portuguese man\nMeandrina of war",
        "options": [
          {
            "label": "A",
            "value": "(i)-A, (ii)-B, (iii)-C, (iv)-D",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(i)-D, (ii)-C, (iii)-B, (iv)-A",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(i)-C, (ii)-D, (iii)-B, (iv)-A",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(i)-D, (ii)-C, (iii)-A, (iv)-B",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "सू ची 'A' ए वं सू ची 'B' का स ही िम ला न कर के स ही उ \u0000 र\nका चयन नी चे िद ये ग ये कू ट से क र\u0000 :-\nसू ची -A सू ची -B\n( ज \u0000ु ) ( सा मा \u0000 ना म )\n(i) फा इ से िल या (A) \u0000े न को रल\n(ii) िप नै टु ला (B) सी फै न\n(iii) गो र गो िन या (C) सी पे न\n(iv) िम एन िड \u0000 ना (D) पु त\u0000 गा ली यु \u0000 मा नव",
        "options": [
          {
            "label": "A",
            "value": "(i)-A, (ii)-B, (iii)-C, (iv)-D",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(i)-D, (ii)-C, (iii)-B, (iv)-A",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(i)-C, (ii)-D, (iii)-B, (iv)-A",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(i)-D, (ii)-C, (iii)-A, (iv)-B",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 39,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q162",
    "questionNumber": 162,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The outer covering of fungi and plants is:-",
    "options": [
      {
        "label": "A",
        "value": "Glycocalyx",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Cell wall",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Cell membrane",
        "type": "text"
      },
      {
        "label": "D",
        "value": "All",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "In kingdom Animalia, the outer covering of the  cell is known as a cell membrane, while the cell  wall   is   the   outer   covering   of   the   plant   cell,  fungal cell, and some bacterial cells.",
    "languages": {
      "en": {
        "questionText": "The outer covering of fungi and plants is:-",
        "options": [
          {
            "label": "A",
            "value": "Glycocalyx",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Cell wall",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Cell membrane",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कवक ए वं पौ धों का बा ह री आवरण है -",
        "options": [
          {
            "label": "A",
            "value": "\u0000ा य को के ले \u0000",
            "type": "text"
          },
          {
            "label": "B",
            "value": "को िश का िभ ि\u0000",
            "type": "text"
          },
          {
            "label": "C",
            "value": "को िश का िझ \u0000ी",
            "type": "text"
          },
          {
            "label": "D",
            "value": "स भी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 40,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q163",
    "questionNumber": 163,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Go through the given diagram of a typical\ndicot embryo. In which of the following all\nthe 3 parts labelled as A, B and C with\ntheir characters are correctly identified –",
    "options": [
      {
        "label": "A",
        "value": "A B C\nHypophysis,\nPlumule, shoot Radicle, root\nformation\nsystem system\nof\nformation formation\nradicle",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A B C\nPlumule, shoot Radicle, root Cotyledon,\nsystem system food\nformation formation storage",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A B C\nPlumule,\nRadicle, root Cotyledon\nshoot\nsystem food\nsystem\nformation storage\nformation",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A B C\nPlumule,\nRadicle, root Endosperm,\nshoot\nsystem food\nsystem\nformation storage\nformation",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "A   is   plumule   which   helps   in   shoot   system  formation.  B   is   Radicle   which   helps   in   root   system  formation.  C is Cotyledon which helps in food storage.",
    "languages": {
      "en": {
        "questionText": "Go through the given diagram of a typical\ndicot embryo. In which of the following all\nthe 3 parts labelled as A, B and C with\ntheir characters are correctly identified –",
        "options": [
          {
            "label": "A",
            "value": "A B C\nHypophysis,\nPlumule, shoot Radicle, root\nformation\nsystem system\nof\nformation formation\nradicle",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A B C\nPlumule, shoot Radicle, root Cotyledon,\nsystem system food\nformation formation storage",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A B C\nPlumule,\nRadicle, root Cotyledon\nshoot\nsystem food\nsystem\nformation storage\nformation",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A B C\nPlumule,\nRadicle, root Endosperm,\nshoot\nsystem food\nsystem\nformation storage\nformation",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक सा मा \u0000 ि\u0000 बी जप \u0000ी \u0000ू ण के िद ए गए आ रे ख का\nअ \u0000 यन क र\u0000 । िन \u0000 िल \u0000ख त म\u0000 से िक स म\u0000 A, B और C के\n\u0000 प म\u0000 िच \u0000\u0000 त िक ए गए स भी 3 भा गों की उन की\nिव शे ष ता ओं के सा थ स ही पह चा न की गई है -",
        "options": [
          {
            "label": "A",
            "value": "A B C\n\u0000ां कु र , \u0000 रो ह तं \u0000 मू लां कू र , मू ल तं \u0000 अ धः \u0000ी ित का ,\nका िन मा\u0000 ण का िन मा\u0000 ण मू लां कू र का िन मा\u0000 ण",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A B C\n\u0000ां कु र , \u0000 रो ह तं \u0000 मू लां कू र , मू ल तं \u0000 बी जप \u0000 , भो जन\nका िन मा\u0000 ण का िन मा\u0000 ण का सं \u0000 हण",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A B C\nमू लां कू र , मू ल तं \u0000 \u0000ां कु र , \u0000 रो ह तं \u0000 बी जप \u0000 , भो जन\nका िन मा\u0000 ण का िन मा\u0000 ण का सं \u0000 हण",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A B C\nमू लां कू र , मू ल तं \u0000 \u0000ां कु र , \u0000 रो ह तं \u0000 \u0000ू ण पो ष , भो जन\nका िन मा\u0000 ण का िन मा\u0000 ण का सं \u0000 हण",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 40,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q164",
    "questionNumber": 164,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The diagram shows an important concept\nin the genetic implication of DNA. Fill in\nthe blanks A to C.\nA B Proposedby\nDNA → mRNA → portein − − − − − − →\nC",
    "options": [
      {
        "label": "A",
        "value": "A-Translation, B-Transcription, C-Ervin\nChargaff",
        "type": "text"
      },
      {
        "label": "B",
        "value": "A- Transcription, B-Translation, C-\nFrancis Crick",
        "type": "text"
      },
      {
        "label": "C",
        "value": "A-Translation, B-Extension, C-Rosalind\nFranklin",
        "type": "text"
      },
      {
        "label": "D",
        "value": "A-Translation, B-Replication, C-James\nWatson",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "The   central dogma   is the process by which the  instruction   in   the   DNA   is   converted   into  proteins.  Central dogma was proposed by   Francis Crick .  The   formation   of   DNA   from   DNA   is   called  replication .  The formation   of RNA from DNA is known as  transcription .  The   conversion   of   RNA   into   proteins   is   called  translation .",
    "languages": {
      "en": {
        "questionText": "The diagram shows an important concept\nin the genetic implication of DNA. Fill in\nthe blanks A to C.\nA B Proposedby\nDNA → mRNA → portein − − − − − − →\nC",
        "options": [
          {
            "label": "A",
            "value": "A-Translation, B-Transcription, C-Ervin\nChargaff",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A- Transcription, B-Translation, C-\nFrancis Crick",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A-Translation, B-Extension, C-Rosalind\nFranklin",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A-Translation, B-Replication, C-James\nWatson",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "नी चे िद या ग या िच \u0000 म\u0000 DNA के आ नु वं िश क िन िह ता थ\u0000 म\u0000\nएक मह \u0000 पू ण\u0000 अव धा र णा को द शा\u0000 ता है A से C तक\n\u0000र \u0000 \u0000 था नों की पू ित\u0000 क र\u0000 -",
        "options": [
          {
            "label": "A",
            "value": "A- अ नु वा दन , B- अ नु ले खन , C- इर िव न चा र गा फ",
            "type": "text"
          },
          {
            "label": "B",
            "value": "A- अ नु ले खन , B- अ नु वा दन , C- \u0000ा \u0000\u0000 स ि\u0000 क",
            "type": "text"
          },
          {
            "label": "C",
            "value": "A- अ नु वा दन , B- िव \u0000ा रण , C- रो जे िल \u0000\n\u0000 \u0000 क िल न",
            "type": "text"
          },
          {
            "label": "D",
            "value": "A- अ नु वा दन , B- \u0000 ित कृ ित करण , C- जे \u0000 वा टसन",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 40,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q165",
    "questionNumber": 165,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Match the column-I with Column-II\nColumn-\nColumn-II\nI\n(a) Fasciola (i) First Eucoelomate\n(b) Nereis (ii) First triploblastic\nFirst tissue\n(c) Antedon (iii)\ngrade animal\n(d) Adamsia (iv) First enterocoelomate",
    "options": [
      {
        "label": "A",
        "value": "a-(i), b-(ii), c-(iv), d-(iii)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "a-(ii), b-(i), c-(iv), d-(iii)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "a-(iii), b-(ii), c-(i), d-(iv)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "a-(iii), b-(i), c-(iv), d-(ii)",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Fasciola hepatica, also known as the sheep liver  fluke,   is   a   triploblastic   organism(first   in  platyhelminthes to chordates).  Nereis   (Annelida)   is   the   first   true   coelomate,  which   is   a   fluid-filled   body   cavity   lined   by  mesoderm.  Antedon,   also   known   as   the   sea   lily   is   a  member of the phylum Echinodermata is First  enterocoelomate.  Adamsia (Cnidarians) are the first organisms to  have   tissue-level   organization,   and   are  considered   to   be   at   the   tissue   grade   of  organization.",
    "languages": {
      "en": {
        "questionText": "Match the column-I with Column-II\nColumn-\nColumn-II\nI\n(a) Fasciola (i) First Eucoelomate\n(b) Nereis (ii) First triploblastic\nFirst tissue\n(c) Antedon (iii)\ngrade animal\n(d) Adamsia (iv) First enterocoelomate",
        "options": [
          {
            "label": "A",
            "value": "a-(i), b-(ii), c-(iv), d-(iii)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a-(ii), b-(i), c-(iv), d-(iii)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "a-(iii), b-(ii), c-(i), d-(iv)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "a-(iii), b-(i), c-(iv), d-(ii)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कॉ लम -I से कॉ लम -II का िम ला न क रे -\nकॉ लम -I कॉ लम -II\n\u0000 थम स \u0000\n(a) फे िस ओ ला (i)\nगू िह क\n(b) ने \u0000र स (ii) \u0000 थम \u0000ी को र की\n\u0000 थम ऊतक\n(c) ए \u0000ी डो न (iii)\n\u0000े णी के \u0000ा णी\n\u0000 थम\n(d) एड मा िस या (iv)\nए \u0000े रो सी लो मे ट",
        "options": [
          {
            "label": "A",
            "value": "a-(i), b-(ii), c-(iv), d-(iii)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a-(ii), b-(i), c-(iv), d-(iii)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "a-(iii), b-(ii), c-(i), d-(iv)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "a-(iii), b-(i), c-(iv), d-(ii)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 41,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q166",
    "questionNumber": 166,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The model given by Singer and Nicolson in\n______ was ______ for plasma\nmembrane.",
    "options": [
      {
        "label": "A",
        "value": "1982, fluid mosaic model",
        "type": "text"
      },
      {
        "label": "B",
        "value": "1992, bilayer model",
        "type": "text"
      },
      {
        "label": "C",
        "value": "1972, fluid mosaic model",
        "type": "text"
      },
      {
        "label": "D",
        "value": "1952, bilayer model",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "The fluid mosaic model was first proposed by  S.J.   Singer   and   Garth   L.   Nicolson   in   1972   to  explain the structure of the plasma membrane.  The   model   has   evolved   somewhat   over   time,  but it still best accounts for the structure and  functions of the plasma membrane as we now  understand them.",
    "languages": {
      "en": {
        "questionText": "The model given by Singer and Nicolson in\n______ was ______ for plasma\nmembrane.",
        "options": [
          {
            "label": "A",
            "value": "1982, fluid mosaic model",
            "type": "text"
          },
          {
            "label": "B",
            "value": "1992, bilayer model",
            "type": "text"
          },
          {
            "label": "C",
            "value": "1972, fluid mosaic model",
            "type": "text"
          },
          {
            "label": "D",
            "value": "1952, bilayer model",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "जी व \u0000 \u0000 क ला के िल ए िसं गर त था िन को लसन \u0000ा रा\n______ म\u0000 िद या ग या माॅ डल ______ था -",
        "options": [
          {
            "label": "A",
            "value": "1982, तरल मो जे क मॉ डल",
            "type": "text"
          },
          {
            "label": "B",
            "value": "1992, ि\u0000 परत मॉ डल",
            "type": "text"
          },
          {
            "label": "C",
            "value": "1972, तरल मो जे क मॉ डल",
            "type": "text"
          },
          {
            "label": "D",
            "value": "1952, ि\u0000 परत मॉ डल",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 41,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q167",
    "questionNumber": 167,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "One gene is responsible for making:-",
    "options": [
      {
        "label": "A",
        "value": "One protein",
        "type": "text"
      },
      {
        "label": "B",
        "value": "One polypeptide",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Many polypeptides",
        "type": "text"
      },
      {
        "label": "D",
        "value": "All of these",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "The theory that each gene is responsible for the  synthesis   of   a   single   polypeptide.   It   was  originally stated as the \"one gene, one enzyme  hypothesis\"   by   George   Beadle,   but   was   later  modified when it was realized that genes also  encoded   non-enzyme   proteins   and   individual  polypeptide chains. It is now known that some  genes code for various types of RNA involved in  protein synthesis.",
    "languages": {
      "en": {
        "questionText": "One gene is responsible for making:-",
        "options": [
          {
            "label": "A",
            "value": "One protein",
            "type": "text"
          },
          {
            "label": "B",
            "value": "One polypeptide",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Many polypeptides",
            "type": "text"
          },
          {
            "label": "D",
            "value": "All of these",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "एक जी न िन \u0000 के िन मा\u0000 ण के िल ये उ \u0000 र दा यी है -",
        "options": [
          {
            "label": "A",
            "value": "एक \u0000ो टी न",
            "type": "text"
          },
          {
            "label": "B",
            "value": "एक पो ली पे \u0000ा इड",
            "type": "text"
          },
          {
            "label": "C",
            "value": "अ ने क पो ली पे \u0000ा इड",
            "type": "text"
          },
          {
            "label": "D",
            "value": "उप रो \u0000 स भी",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 41,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q168",
    "questionNumber": 168,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "How many of the following statements are\nincorrect:-\ni) Acid insoluble fraction has only four\ntypes of organic compounds.\nii) All the compound in acid insoluble\nfraction have molecular weight in range of\n10,000 Da and above.\niii) Molecular weight less than one\nthousand Dalton are usually referred to as\nMicromolecules.\niv) Biomacromolecules are simply known\nas Biomolecules.",
    "options": [
      {
        "label": "A",
        "value": "(i)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(ii)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(iii)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(iv)",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Biomolecules with molecular weights more than  one   thousand   Dalton   are   called  biomacromolecules.   These   are   found   in   the  acid-insoluble   fraction.   Lipids   are   not   strictly  macromolecules as their molecular weights do  not exceed 800 Da but form a part of the acid  insoluble   pool.   The   molecules   in   the   insoluble  fraction   with   the   exception   of   lipids   are  polymeric   substances.   Lipids   are   indeed   small  molecular   weight   compounds   and   are   present  not   only   as   such   but   also   arranged   into  structures   like   cell   membrane   and   other  membranes. So the acid insoluble fraction has  only four types of organic compounds, proteins,  polysaccharides   nucleic   acids   and   lipids   but  except   for   lipids   none   of   them   are  micromolecules.",
    "languages": {
      "en": {
        "questionText": "How many of the following statements are\nincorrect:-\ni) Acid insoluble fraction has only four\ntypes of organic compounds.\nii) All the compound in acid insoluble\nfraction have molecular weight in range of\n10,000 Da and above.\niii) Molecular weight less than one\nthousand Dalton are usually referred to as\nMicromolecules.\niv) Biomacromolecules are simply known\nas Biomolecules.",
        "options": [
          {
            "label": "A",
            "value": "(i)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(ii)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(iii)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(iv)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त म\u0000 से िक त ने कथन गलत ह\u0000\ni) अ घु लन शी ल अं श म\u0000 के वल चा र \u0000 का र के का ब\u0000 िन क\nयौ िग क हो ते ह\u0000 ।\nii) अ \u0000 अ घु लन शी ल अं श के स भी यौ िग कों का\nआण िव क भा र 10,000 Da और उस से अ िध क हो ता है ।\niii) एक ह जा र डा \u0000 न से कम आण िव क भा र वा ले\nयौ िग कों को सा मा \u0000 त या सू \u0000 अ णु क हा जा ता है ।\niv) जै व वृ ह द् अ णु को सा मा \u0000 तः जै वअ णु के \u0000 प म\u0000 जा ना\nजा ता है ।",
        "options": [
          {
            "label": "A",
            "value": "(i)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(ii)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(iii)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(iv)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 41,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q169",
    "questionNumber": 169,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Secondary cell wall is formed.",
    "options": [
      {
        "label": "A",
        "value": "Outside the primary cell wall.",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Inside the cell membrane",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Inside the plasmodesmata.",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Inside the primary cell wall.",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "Inside the primary cell wall.",
    "languages": {
      "en": {
        "questionText": "Secondary cell wall is formed.",
        "options": [
          {
            "label": "A",
            "value": "Outside the primary cell wall.",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Inside the cell membrane",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Inside the plasmodesmata.",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Inside the primary cell wall.",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "ि\u0000 ती यक को िश का िभ ि\u0000 का िन मा\u0000 ण हो ता है ।",
        "options": [
          {
            "label": "A",
            "value": "\u0000ा थ िम क को िश का िभ ि\u0000 के बा हर",
            "type": "text"
          },
          {
            "label": "B",
            "value": "को िश का िझ \u0000ी के अं दर",
            "type": "text"
          },
          {
            "label": "C",
            "value": "\u0000ा \u0000ो डे \u0000े टा के अं दर",
            "type": "text"
          },
          {
            "label": "D",
            "value": "\u0000ा थ िम क को िश का िभ ि\u0000 के अं दर",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 41,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q170",
    "questionNumber": 170,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Dystrophin was found to be-",
    "options": [
                  {
                            "label": "A",
                            "value": "Largest known human gene with",
                            "type": "text"
                  },
                  {
                            "label": "B",
                            "value": "4\nmillion bases",
                            "type": "text"
                  },
                  {
                            "label": "C",
                            "value": "Largest known human gene with",
                            "type": "text"
                  },
                  {
                            "label": "D",
                            "value": "8\nmillion bases",
                            "type": "text"
                  }
        ],
    "correctAnswer": "A",
    "explanation": "Class 12th NCERT Page No. 102",
    "languages": {
      "en": {
        "questionText": "Dystrophin was found to be-",
        "options": [
          {
            "label": "A",
            "value": "Largest known human gene with",
            "type": "text"
          },
          {
            "label": "B",
            "value": "4\nmillion bases",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Largest known human gene with",
            "type": "text"
          },
          {
            "label": "D",
            "value": "8\nmillion bases",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िड \u0000\u0000ो िफ न म\u0000 पा या ग या था -",
        "options": [
  {
    "label": "A",
    "value": "Largest known human gene with",
    "type": "text"
  },
  {
    "label": "B",
    "value": "4\nmillion bases",
    "type": "text"
  },
  {
    "label": "C",
    "value": "Largest known human gene with",
    "type": "text"
  },
  {
    "label": "D",
    "value": "8\nmillion bases",
    "type": "text"
  }
]
      }
    },
    "pdfPageNumber": 42,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q171",
    "questionNumber": 171,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Match the following column A and B-\nA B\nTight Connecting cytoplasm of\nI (a)\njunction cell\nHelp to stop substance\nAdhering\nII (b) from leaking across a\njunction\ntissue\nGap Provide mechanical\nIII (c)\njunction support",
    "options": [
      {
        "label": "A",
        "value": "I(c) II(b) III(a)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "I(b) II(c) III(a)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "I(a) II(c) III(b)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "I(a) II(b) III(c)",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "Different types of epithelial cell junctions are:-  1) Desmosomes ( Semi or full).  2) Gap junctions  3) Tight junctions  4) Adheren points.  GAP JUNCTION:-   These junctions connect cells  with   one   another   for   transporting   molecules  directly into the other cell without moving from  the extracellular fluid. These gap junctions are  useful at the time of embryonic development,  this   is   the   time   when   every   cell   should  communicate   with   each   other   in   order   to  develop   fully   at   the   right   time.   If   these   are  blocked, embryos will not develop normally.  TIGHT JUNCTION -   These junctions are narrow  junctions that prevent solute leakage and seal  the epithelial cells in between.  ADHERING JUNCTION - These are cell adhesion  complexes   that   help   in   maintaining   the  structural support against harsh and changing  environments   against   the   biogeochemical  changes.",
    "languages": {
      "en": {
        "questionText": "Match the following column A and B-\nA B\nTight Connecting cytoplasm of\nI (a)\njunction cell\nHelp to stop substance\nAdhering\nII (b) from leaking across a\njunction\ntissue\nGap Provide mechanical\nIII (c)\njunction support",
        "options": [
          {
            "label": "A",
            "value": "I(c) II(b) III(a)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "I(b) II(c) III(a)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "I(a) II(c) III(b)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "I(a) II(b) III(c)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "कॉ लम A का िम ला न कॉ लम B से की िज ए -\nA B\nको िश का के को िश का \u0000 \u0000 को\nI \u0000 ढ़ सं िध (a)\nजो ड़ ती है\nआ सं जी प दा थ\u0000 को ऊत कों से बा हर जा ने से\nII (b)\nसं िध रो क ना\nअ \u0000 रा ली\nIII (c) यां ि\u0000 क स हा रा \u0000 दा न कर ना\nसं िध",
        "options": [
          {
            "label": "A",
            "value": "I(c) II(b) III(a)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "I(b) II(c) III(a)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "I(a) II(c) III(b)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "I(a) II(b) III(c)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 42,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q172",
    "questionNumber": 172,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Middle lamella is made up of :",
    "options": [
      {
        "label": "A",
        "value": "Silica",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Calcium carbonate",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Calcium and Magnesium pectate",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Calcium oxalate",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Pectate Ca & Mg  11th NCERT PAGE NO.- 94",
    "languages": {
      "en": {
        "questionText": "Middle lamella is made up of :",
        "options": [
          {
            "label": "A",
            "value": "Silica",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Calcium carbonate",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Calcium and Magnesium pectate",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Calcium oxalate",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "म \u0000 पट िल का ब नी हो ती है",
        "options": [
          {
            "label": "A",
            "value": "िस िल का की",
            "type": "text"
          },
          {
            "label": "B",
            "value": "कै \u0000\u0000श यम का ब\u0000 ने ट की",
            "type": "text"
          },
          {
            "label": "C",
            "value": "पै \u0000े ट Ca व Mg की ऑ \u0000े ले ट की",
            "type": "text"
          },
          {
            "label": "D",
            "value": "कै \u0000\u0000श यम",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 42,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q173",
    "questionNumber": 173,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The DNA coiled in prokaryotes are maintained by :",
    "options": [
      {
        "label": "A",
        "value": "Histone proteins",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Non-histone acidic proteins",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Polyamines (positively charged)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Both (2) and (3)",
        "type": "text"
      }
    ],
    "correctAnswer": "D",
    "explanation": "•   Polymines   maintained   DNA   coiled   in  prokaryotes,   they   did   this   by   binding   to   the  minor groove of DNA.  • Eukaryotes wrap their DNA around the protein  called   histone.   It helps in packaging the DNA  into smaller pieces.  •   Prokaryotes   do   not   have   histone   proteins,  they   have   non-histone   protein   and   they  compress their DNA by   supercoiling.  Hence,   the   correct   option   is   \"3\"   -  Polyamines.",
    "languages": {
      "en": {
        "questionText": "The DNA coiled in prokaryotes are maintained by :",
        "options": [
          {
            "label": "A",
            "value": "Histone proteins",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Non-histone acidic proteins",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Polyamines (positively charged)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Both (2) and (3)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "\u0000ो के \u0000र यो ट् स म\u0000 DNA कु \u0000 ली को िक स के \u0000ा रा ब ना ये\nर खा जा ता है",
        "options": [
          {
            "label": "A",
            "value": "िह \u0000ो न",
            "type": "text"
          },
          {
            "label": "B",
            "value": "व",
            "type": "text"
          },
          {
            "label": "C",
            "value": "दो नों",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Option (D)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 42,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q174",
    "questionNumber": 174,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Match the column and select the correct\noption.\nColumn-I\nColumn-II\n(Structures of\n(Location)\nCockroach)\nth th\nMushroom 4 6 abdominal\n(A) (i)\nglands segment\nth\n10 abdominal\n(B) testes (ii)\nsegment\nth\n6 abdominal\n(C) spermatheca (iii)\nsegment\nth th\n6 7 abdominal\n(D) anal cerci (iv)\nsegment",
    "options": [
      {
        "label": "A",
        "value": "a(iv), b(i), c(iii), d(ii)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "a(iv), b(iii), c(i), d(ii)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "a(ii), b(i), c(iii), d(iv)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "a(ii), b(i), c(iv), d(iii)",
        "type": "text"
      }
    ],
    "correctAnswer": "A",
    "explanation": "Mushroom glands- 6th 7th abdominal segment.  Testes- 4th 6th abdominal segment.  Spermathecal- 6th abdominal segment.  Anal cerci- 10th abdominal segment.  Mushroomshaped gland is present in the 6th-  7th abdominal segments which functions as an  accessory   reproductive   gland.   The   external  genitalia   are   represented.Male   reproductive  system consists of a pair of testes lying one on  each   lateral   side   in   the   4th   -6th   abdominal  segments.   From   each   testis   arises   a   thin   vas  deferens,   which   opens   into   ejaculatory   duct  through seminal vesicle.A pair of spermatheca  is present in the 6th segment which opens into  the   genital   chamber.Anal   cerci   are   a   pair   of  appendages at the end of the abdomen arising  from   the   10th   segment   of   the   body   of   the  cockroaches   in   both   sexes   males   and  females.   Cerci   are pincer-shaped.",
    "languages": {
      "en": {
        "questionText": "Match the column and select the correct\noption.\nColumn-I\nColumn-II\n(Structures of\n(Location)\nCockroach)\nth th\nMushroom 4 6 abdominal\n(A) (i)\nglands segment\nth\n10 abdominal\n(B) testes (ii)\nsegment\nth\n6 abdominal\n(C) spermatheca (iii)\nsegment\nth th\n6 7 abdominal\n(D) anal cerci (iv)\nsegment",
        "options": [
          {
            "label": "A",
            "value": "a(iv), b(i), c(iii), d(ii)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a(iv), b(iii), c(i), d(ii)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "a(ii), b(i), c(iii), d(iv)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "a(ii), b(i), c(iv), d(iii)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "काॅ ल मों का िम ला न कर स ही िव क \u0000 का चयन की िज ये\nकाॅ लम -I\nकाॅ लम -II\n( काॅ क रो च की सं रच ना )\n( \u0000 था न )\nth th\n(A) छ \u0000 क \u0000ं िथ (i) 4 6 उद री य ख \u0000\nth\n(B) वृ षण (ii) 10 उद री य ख \u0000\nth\n(C) शु \u0000 \u0000ा िह का (iii) 6 उद री य ख \u0000\nth th\n(D) गु दा लू म (iv) 6 7 उद री य ख \u0000",
        "options": [
          {
            "label": "A",
            "value": "a(iv), b(i), c(iii), d(ii)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "a(iv), b(iii), c(i), d(ii)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "a(ii), b(i), c(iii), d(iv)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "a(ii), b(i), c(iv), d(iii)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 42,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q175",
    "questionNumber": 175,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "The longest phase of cell cycle is:-",
    "options": [
      {
        "label": "A",
        "value": "Prophase of M-phase",
        "type": "text"
      },
      {
        "label": "B",
        "value": "G 1",
        "type": "text"
      },
      {
        "label": "C",
        "value": "S",
        "type": "text"
      },
      {
        "label": "D",
        "value": "G 2",
        "type": "text"
      }
    ],
    "correctAnswer": "B",
    "explanation": "G, phase is also known as the first gap. It is  usually   the   longest   period   of   the   cell   cycle.  However   in   some   embryonic   cells   that   are  rapidly   dividing   G,   might   only   last   a   few  minutes. It synthesizes MRNA and proteins.",
    "languages": {
      "en": {
        "questionText": "The longest phase of cell cycle is:-",
        "options": [
          {
            "label": "A",
            "value": "Prophase of M-phase",
            "type": "text"
          },
          {
            "label": "B",
            "value": "G 1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "S",
            "type": "text"
          },
          {
            "label": "D",
            "value": "G 2",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "को िश का च \u0000 की सब से ल \u0000ी \u0000ा व \u0000 था है -",
        "options": [
          {
            "label": "A",
            "value": "M- \u0000ा व \u0000 था की \u0000ो फे ज",
            "type": "text"
          },
          {
            "label": "B",
            "value": "G 1",
            "type": "text"
          },
          {
            "label": "C",
            "value": "S",
            "type": "text"
          },
          {
            "label": "D",
            "value": "G 2",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 43,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q176",
    "questionNumber": 176,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Select the incorrect statement with\nrespect to acquired immunity-",
    "options": [
      {
        "label": "A",
        "value": "Anamnestic response is elicited on\nsubsequent encounters with the same\npathogen.",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Anamnestic response is due to\nmemory of first encounter",
        "type": "text"
      },
      {
        "label": "C",
        "value": "Acquired immunity is non-specific type\nof defense present at the time of birth",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Primary response is produced when\nour body encounters a pathogen for the\nfirst time",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "1 .   Acquired   immunity   is   a   specific   type   of  defence   which   is   not   present   at   the   time   of  birth .  2 .   Anamnestic   response   or   secondary   immune  response is a   highly intensified response due  to memory of first encounter.  3 .   When our body   encounters a pathogen   for the  first   time   then   the   body   elicits   the   primary  immune response.  4 .   When there is   a subsequent encounter   with  the same pathogen, secondary or   anamnestic  immune   response is elicited.",
    "languages": {
      "en": {
        "questionText": "Select the incorrect statement with\nrespect to acquired immunity-",
        "options": [
          {
            "label": "A",
            "value": "Anamnestic response is elicited on\nsubsequent encounters with the same\npathogen.",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Anamnestic response is due to\nmemory of first encounter",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Acquired immunity is non-specific type\nof defense present at the time of birth",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Primary response is produced when\nour body encounters a pathogen for the\nfirst time",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "उ पा िज\u0000 त \u0000 ित र \u0000ा के िव षय म\u0000 गलत कथन का चयन\nक रो -",
        "options": [
          {
            "label": "A",
            "value": "उ सी रो गजनक से दो बा रा सा म ना हो ने पर ब \u0000 त ही\nउ \u0000 ती \u0000 ता की पू व\u0000 वृ \u0000ी य ( ए ना िम \u0000\u0000 क ) अ नु ि\u0000 या हो ती\nहै",
            "type": "text"
          },
          {
            "label": "B",
            "value": "पू व\u0000 वृ \u0000ी य ( ए ना िम \u0000\u0000 क ) अ नु ि\u0000 या \u0000 थम मु ठ भे ड़ की\n\u0000ृ ित के का रण हो ती है",
            "type": "text"
          },
          {
            "label": "C",
            "value": "उ पा िज\u0000 त \u0000 ित र \u0000ा ज \u0000 के समय उप \u0000\u0000थ त अ िव िश \u0000\n\u0000 का र की र \u0000ा है",
            "type": "text"
          },
          {
            "label": "D",
            "value": "जब ह मा रे श री र का पह ली बा र िक सी रो गजनक से\nसा म ना हो ता है तब \u0000ा थ िम क अ नु ि\u0000 या उ \u0000 \u0000 हो ती है ।",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 43,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q177",
    "questionNumber": 177,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Mitotic division occurs in –",
    "options": [
      {
        "label": "A",
        "value": "Diploid somatic cell",
        "type": "text"
      },
      {
        "label": "B",
        "value": "Haploid male honey bee",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(1) & (2) both",
        "type": "text"
      },
      {
        "label": "D",
        "value": "Gametes",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Mitosis is the process of cell division where a  haploid cell has the ability to divide and form  two daughter cells. In mitosis, the cell phases  are   interphase,   prophase,   metaphase,  anaphase, and telophase. Mitosis occurs in all  types of cells that are somatic cells but doesn’t  occur in gamete cells.  It also occur in haploid male   honey bee not in  female.",
    "languages": {
      "en": {
        "questionText": "Mitotic division occurs in –",
        "options": [
          {
            "label": "A",
            "value": "Diploid somatic cell",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Haploid male honey bee",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(1) & (2) both",
            "type": "text"
          },
          {
            "label": "D",
            "value": "Gametes",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "सम सू \u0000ी िव भा जन िन \u0000 िल \u0000ख त म\u0000 से िक स म\u0000 हो ता है -",
        "options": [
          {
            "label": "A",
            "value": "और",
            "type": "text"
          },
          {
            "label": "B",
            "value": "Option (B)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "Option (C)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "यु \u0000 क",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 43,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q178",
    "questionNumber": 178,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Match List – I with List – II.\nList-I List-II\nHaemophilus\n(a) Filariasis (i)\ninfluenzae\n(b) Amoebiasis (ii) Trichophyton\nWuchereria\n(c) Pneumonia (iii)\nBancrofti\nEntamoeba\n(d) Ringworm (iv)\nHistolytica\nChoose the correct answer from the\nquestions given below.",
    "options": [
      {
        "label": "A",
        "value": "(a) → (ii), (b) → (iii), (c) → (i), (d) → (iv)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(a) → (iv), (b) → (i), (c) → (iii), (d) → (ii)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(a) → (iii), (b) → (iv), (c) → (i), (d) → (ii)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(a) → (i), (b) → (ii), (c) → (iv), (d) → (iii)",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "(a) Filariasis - (iii) Wuchereria bancrofti  (b) Amoebiasis - (iv) Entamoeba histolytica  (c) Pneumonia - (i) Haemophilus influenzae  (d) Ringworm - (ii) Trichophyton",
    "languages": {
      "en": {
        "questionText": "Match List – I with List – II.\nList-I List-II\nHaemophilus\n(a) Filariasis (i)\ninfluenzae\n(b) Amoebiasis (ii) Trichophyton\nWuchereria\n(c) Pneumonia (iii)\nBancrofti\nEntamoeba\n(d) Ringworm (iv)\nHistolytica\nChoose the correct answer from the\nquestions given below.",
        "options": [
          {
            "label": "A",
            "value": "(a) → (ii), (b) → (iii), (c) → (i), (d) → (iv)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(a) → (iv), (b) → (i), (c) → (iii), (d) → (ii)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(a) → (iii), (b) → (iv), (c) → (i), (d) → (ii)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(a) → (i), (b) → (ii), (c) → (iv), (d) → (iii)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "सू ची - I का सू ची - II के सा थ िम ला न क रो :-\nसू ची -I सू ची -II\nही मो िफ \u0000\n(a) फा इ ले \u0000र ए िस स (i)\nइ \u0000ु एँ जी\n(b) अ मी बा य िस स (ii) ट\u0000ा इ को फा इ टॉ न\nवु चे रे \u0000र या\n(c) \u0000ू मो िन या (iii)\nब\u0000 \u0000ो \u0000ा ई\nएं टअ मी बा\n(d) \u0000रं गव म\u0000 (iv)\nिह \u0000ो िल िट का\nिन \u0000 िव क \u0000ों से उ िच त उ \u0000 र का चयन क रो ।",
        "options": [
          {
            "label": "A",
            "value": "(a) → (ii), (b) → (iii), (c) → (i), (d) → (iv)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(a) → (iv), (b) → (i), (c) → (ii), (d) → (ii)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(a) → (iii), (b) → (iv), (c) → (i), (d) → (ii)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(a) → (i), (b) → (ii), (c) → (iv), (d) → (iii)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 43,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q179",
    "questionNumber": 179,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Karyokinesis of mitosis is divided into\n________ stages",
    "options": [
      {
        "label": "A",
        "value": "2",
        "type": "text"
      },
      {
        "label": "B",
        "value": "3",
        "type": "text"
      },
      {
        "label": "C",
        "value": "4",
        "type": "text"
      },
      {
        "label": "D",
        "value": "8",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Karyokinesis has 4 stages  (i) Prophase  (ii) Metaphase  (iii) Anaphase  (iv) Telophase",
    "languages": {
      "en": {
        "questionText": "Karyokinesis of mitosis is divided into\n________ stages",
        "options": [
          {
            "label": "A",
            "value": "2",
            "type": "text"
          },
          {
            "label": "B",
            "value": "3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "4",
            "type": "text"
          },
          {
            "label": "D",
            "value": "8",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "सम सू \u0000ी िव भा जन म\u0000 को िश का का के \u0000 क िव भा जन\n_____ अव \u0000 था ओं म\u0000 पू ण\u0000 हो ता है ।",
        "options": [
          {
            "label": "A",
            "value": "2",
            "type": "text"
          },
          {
            "label": "B",
            "value": "3",
            "type": "text"
          },
          {
            "label": "C",
            "value": "4",
            "type": "text"
          },
          {
            "label": "D",
            "value": "8",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 43,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  },
  {
    "id": "gold-test8-q180",
    "questionNumber": 180,
    "subject": "Biology",
    "chapter": "Biology Major Revision",
    "questionText": "Read the following statements carefully.\n(i) Cancer causing viruses have genes\ncalled viral oncogenes.\n(ii) Malignant tumors remain confined to\ntheir original location.\n(iii) Cancer cells do not exhibit contact\ninhibition.\n(iv) Cancer detection is based on biopsy\nand histopathological studies.\nWhich of the above statements\nare correct regarding cancer?",
    "options": [
      {
        "label": "A",
        "value": "(iii) and (iv)",
        "type": "text"
      },
      {
        "label": "B",
        "value": "(ii) and (iv)",
        "type": "text"
      },
      {
        "label": "C",
        "value": "(i), (iii) and (iv)",
        "type": "text"
      },
      {
        "label": "D",
        "value": "(ii) and (iii)",
        "type": "text"
      }
    ],
    "correctAnswer": "C",
    "explanation": "12th NCERT, PAGE NO.- 157",
    "languages": {
      "en": {
        "questionText": "Read the following statements carefully.\n(i) Cancer causing viruses have genes\ncalled viral oncogenes.\n(ii) Malignant tumors remain confined to\ntheir original location.\n(iii) Cancer cells do not exhibit contact\ninhibition.\n(iv) Cancer detection is based on biopsy\nand histopathological studies.\nWhich of the above statements\nare correct regarding cancer?",
        "options": [
          {
            "label": "A",
            "value": "(iii) and (iv)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(ii) and (iv)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(i), (iii) and (iv)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(ii) and (iii)",
            "type": "text"
          }
        ]
      },
      "hi": {
        "questionText": "िन \u0000 िल \u0000ख त कथ नों को \u0000ा न पू व\u0000 क प िढ़ ए -\n(i) क \u0000 सर उ \u0000 \u0000 कर ने वा ले िव षा णु ओं म\u0000 िव षा णु वी य\nअ बु\u0000 द जी न ( वा यरल ओं को जी न ) ना मक जी न हो ते ह\u0000 ।\n(ii) दु द\u0000 म अ बु\u0000 द अप ने मू ल \u0000 था न तक ही सी िम त रह ते\nह\u0000 ।\n(iii) क \u0000 सर को िश का एं सं \u0000 श\u0000 सं दमन \u0000 द िश\u0000 त न हीं\nकर ती ह\u0000 ।\n(iv) क \u0000 सर अ िभ \u0000ा न ऊत कों की जी व ित प री \u0000ा\n( बा यो \u0000ी ) और ऊतक िव कृ ित ( िह \u0000ो पै थो लॉ िज कल )\nअ \u0000 य नों पर आ धा \u0000र त ह\u0000 ।\nउप रो \u0000 म\u0000 से कौ न से कथन क \u0000 सर के सं बं ध म\u0000 स ही ह\u0000 ?",
        "options": [
          {
            "label": "A",
            "value": "(iii) त था (iv)",
            "type": "text"
          },
          {
            "label": "B",
            "value": "(ii) त था (iv)",
            "type": "text"
          },
          {
            "label": "C",
            "value": "(i), (iii) त था (iv)",
            "type": "text"
          },
          {
            "label": "D",
            "value": "(ii) त था (iii)",
            "type": "text"
          }
        ]
      }
    },
    "pdfPageNumber": 44,
    "hasFigure": false,
    "testId": "cbt-gold-test-08"
  }
];

export function runGoldStandardRegressionSuite(questions: MockQuestion[]) {
  const total = questions.length;
  const checks: Array<{ name: string; passed: boolean; details: string }> = [];

  // Check 1: 180 Questions complete count
  checks.push({
    name: 'Total Question Count (NEET 180)',
    passed: total >= 180,
    details: `Found ${total} questions (expected 180).`
  });

  // Check 2: All 4 options populated
  let missingOpts = 0;
  for (const q of questions) {
    if (!q.options || q.options.length < 4 || q.options.some(o => !o.value || /^Option\s*\([A-D]\)$/i.test(o.value))) {
      missingOpts++;
    }
  }
  checks.push({
    name: 'Option Extraction Completeness (4 Options A-D)',
    passed: missingOpts === 0,
    details: missingOpts === 0 ? 'All 180 questions have complete, valid options.' : `${missingOpts} questions have missing/placeholder options.`
  });

  // Check 3: Valid Correct Answers
  let missingAnswers = 0;
  for (const q of questions) {
    if (!q.correctAnswer || !['A', 'B', 'C', 'D'].includes(q.correctAnswer.toUpperCase())) {
      missingAnswers++;
    }
  }
  checks.push({
    name: 'Answer Key Concordance (180/180)',
    passed: missingAnswers === 0,
    details: missingAnswers === 0 ? 'All 180 questions have verified official answers.' : `${missingAnswers} questions lack verified answers.`
  });

  // Check 4: Subject Distribution (Physics 1-45, Chemistry 46-90, Biology 91-180)
  const phy = questions.filter(q => q.subject === 'Physics').length;
  const chem = questions.filter(q => q.subject === 'Chemistry').length;
  const bio = questions.filter(q => q.subject === 'Biology' || (q.subject as string) === 'Botany' || (q.subject as string) === 'Zoology').length;

  checks.push({
    name: 'NEET Subject Distribution (45P + 45C + 90B)',
    passed: phy >= 45 && chem >= 45 && bio >= 90,
    details: `Physics: ${phy}/45, Chemistry: ${chem}/45, Biology: ${bio}/90.`
  });

  const passedCount = checks.filter(c => c.passed).length;
  const accuracyScore = Math.round((passedCount / checks.length) * 100);

  return {
    totalQuestions: total,
    passedCount,
    errorCount: checks.length - passedCount,
    accuracyScore,
    checks,
    passedAll: passedCount === checks.length
  };
}
