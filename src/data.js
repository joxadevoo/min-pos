// Base configuration templates for production startup

export const initialProducts = [
  {
    id: "prod-vidalita-100",
    name: "VIDALITA VITAMIN C SERUM 30 ML",
    brand: "Vidalita Cosmetics",
    category: "Face",
    skuPrefix: "VID-VCS",
    description: "Vidalita professional kosmetika vositasi. Vitamin C zardobi - teringizni yorqinlashtiradi va yoshartiradi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Cilt/VITAMINC.jpg",
    variants: [
      {
        id: "var-vidalita-100-1",
        name: "30 ML",
        sku: "VID-VCS-STD",
        colorCode: "#FFD700",
        price: 80000,
        batches: [
          { batchId: "LOT-VID-100", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-101",
    name: "VIDALITA NIACINAMIDE SERUM 30 ML",
    brand: "Vidalita Cosmetics",
    category: "Face",
    skuPrefix: "VID-NIA",
    description: "Vidalita Niasinamid zardobi - g'ovakchalar ko'rinishini kamaytiradi, teri tonusini tenglashtiradi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Cilt/NIACINAMIDE.jpg",
    variants: [
      {
        id: "var-vidalita-101-1",
        name: "30 ML",
        sku: "VID-NIA-STD",
        colorCode: "#E8F4FD",
        price: 64000,
        batches: [
          { batchId: "LOT-VID-101", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-102",
    name: "VIDALITA HYA SERUM 30 ML",
    brand: "Vidalita Cosmetics",
    category: "Face",
    skuPrefix: "VID-HYA",
    description: "Vidalita Gialuron kislota zardobi - chuqur namlantirish va teri elastikligini oshirish uchun.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Cilt/HYA SERUM.jpg",
    variants: [
      {
        id: "var-vidalita-102-1",
        name: "30 ML",
        sku: "VID-HYA-STD",
        colorCode: "#C7E8FA",
        price: 52000,
        batches: [
          { batchId: "LOT-VID-102", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-103",
    name: "VIDALITA EYE CONTOUR SERUM 30 ML",
    brand: "Vidalita Cosmetics",
    category: "Face",
    skuPrefix: "VID-ECS",
    description: "Vidalita Ko'z atrofi zardobi - ko'z ostidagi qorayish va shishishni kamaytiradi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Cilt/cilt_7_1.jpg",
    variants: [
      {
        id: "var-vidalita-103-1",
        name: "30 ML",
        sku: "VID-ECS-STD",
        colorCode: "#F0E6FF",
        price: 72000,
        batches: [
          { batchId: "LOT-VID-103", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-104",
    name: "VIDALITA CLEASING GEL 200 ML",
    brand: "Vidalita Cosmetics",
    category: "Face",
    skuPrefix: "VID-CLG",
    description: "Vidalita Tozalovchi gel - teringizni chuqur tozalaydi va ortiqcha moylikni olib tashlaydi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Cilt/CLEANSING GEL.jpg",
    variants: [
      {
        id: "var-vidalita-104-1",
        name: "200 ML",
        sku: "VID-CLG-STD",
        colorCode: "#E8FAF4",
        price: 68000,
        batches: [
          { batchId: "LOT-VID-104", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-105",
    name: "VIDALITA GLYCOLIC TONIC 200 ML",
    brand: "Vidalita Cosmetics",
    category: "Face",
    skuPrefix: "VID-GLT",
    description: "Vidalita Glikol tonik - teri yuzasini yangilaydi va yorqinlashtiradi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Cilt/TONIC.jpg",
    variants: [
      {
        id: "var-vidalita-105-1",
        name: "200 ML",
        sku: "VID-GLT-STD",
        colorCode: "#FFF0E8",
        price: 68000,
        batches: [
          { batchId: "LOT-VID-105", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-106",
    name: "VIDALITA MOISTURIZING CREAM 50 ML",
    brand: "Vidalita Cosmetics",
    category: "Face",
    skuPrefix: "VID-MOC",
    description: "Vidalita Namlantiruvchi krem - har kunlik namlanish va teri muhofazasi uchun.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Cilt/MOISTURIZING.jpg",
    variants: [
      {
        id: "var-vidalita-106-1",
        name: "50 ML",
        sku: "VID-MOC-STD",
        colorCode: "#FFF9E6",
        price: 56000,
        batches: [
          { batchId: "LOT-VID-106", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-107",
    name: "VIDALITA FRUIT ENZYME PEELING 55 GR",
    brand: "Vidalita Cosmetics",
    category: "Face",
    skuPrefix: "VID-FEP",
    description: "Vidalita Mevali fermentli piling - tabiiy fermentlar yordamida terini nozik tozalash.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Cilt/FRUIT ENZYME.jpg",
    variants: [
      {
        id: "var-vidalita-107-1",
        name: "55 GR",
        sku: "VID-FEP-STD",
        colorCode: "#FFE4B5",
        price: 140000,
        batches: [
          { batchId: "LOT-VID-107", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-108",
    name: "VIDALITA 50+SPF BB CREAM MEDIUM 50 ML",
    brand: "Vidalita Cosmetics",
    category: "Face",
    skuPrefix: "VID-BBC",
    description: "Vidalita BB Krem SPF 50+ - quyoshdan himoya va tenlashtiruvchi effekt birgalikda.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Gunes/BBCREAM.jpg",
    variants: [
      {
        id: "var-vidalita-108-1",
        name: "50 ML",
        sku: "VID-BBC-STD",
        colorCode: "#D4A574",
        price: 125000,
        batches: [
          { batchId: "LOT-VID-108", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-109",
    name: "VIDALITA 50+SPF SUNSCREEN CREAM 50 ML",
    brand: "Vidalita Cosmetics",
    category: "Face",
    skuPrefix: "VID-SUN",
    description: "Vidalita Quyoshdan himoyalovchi krem SPF 50+ - kuchli ultrabinafsha nurlardan ishonchli himoya.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Gunes/SUNSCREEN.jpg",
    variants: [
      {
        id: "var-vidalita-109-1",
        name: "50 ML",
        sku: "VID-SUN-STD",
        colorCode: "#FFF8DC",
        price: 95000,
        batches: [
          { batchId: "LOT-VID-109", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-110",
    name: "VIDALITA HAIR CONDITIONER 200 ML",
    brand: "Vidalita Cosmetics",
    category: "Hair",
    skuPrefix: "VID-HCO",
    description: "Vidalita Soch konditsioneri - sochlarga namliq va yumshoqlik beradi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Sac/HAIRCONDATIONER.jpg",
    variants: [
      {
        id: "var-vidalita-110-1",
        name: "200 ML",
        sku: "VID-HCO-STD",
        colorCode: "#E6F3FF",
        price: 48000,
        batches: [
          { batchId: "LOT-VID-110", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-111",
    name: "VIDALITA ANI HAIR LOSS SHAMPOO 200 ML",
    brand: "Vidalita Cosmetics",
    category: "Hair",
    skuPrefix: "VID-AHS",
    description: "Vidalita Soch to'kilishiga qarshi shampun - soch ildizlarini kuchaytiradi va to'kilishni kamaytiradi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Sac/ANTIHAIRLOSS.jpg",
    variants: [
      {
        id: "var-vidalita-111-1",
        name: "200 ML",
        sku: "VID-AHS-STD",
        colorCode: "#E8FFE8",
        price: 56000,
        batches: [
          { batchId: "LOT-VID-111", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-112",
    name: "VIDALITA MOISTURIZING CREAM UREA 200 ML",
    brand: "Vidalita Cosmetics",
    category: "Body",
    skuPrefix: "VID-MCU",
    description: "Vidalita Karbamidli namlantiruvchi krem - quruq terini chuqur namlantiradi va yumshatadi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Vucut/MOISTURIZING CREAM.jpg",
    variants: [
      {
        id: "var-vidalita-112-1",
        name: "200 ML",
        sku: "VID-MCU-STD",
        colorCode: "#FFF5E6",
        price: 50000,
        batches: [
          { batchId: "LOT-VID-112", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-113",
    name: "VIDALITA SOOTHING CREAM 200 ML",
    brand: "Vidalita Cosmetics",
    category: "Body",
    skuPrefix: "VID-SOC",
    description: "Vidalita Tinchlantiruvchi krem - sezgir terini tinchlantiradi va qizillikni kamaytiradi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Vucut/SOOTHINGCREAM.jpg",
    variants: [
      {
        id: "var-vidalita-113-1",
        name: "200 ML",
        sku: "VID-SOC-STD",
        colorCode: "#E8F8F5",
        price: 60000,
        batches: [
          { batchId: "LOT-VID-113", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-114",
    name: "VIDALITA BARRIER CREAM 200 ML",
    brand: "Vidalita Cosmetics",
    category: "Body",
    skuPrefix: "VID-BAC",
    description: "Vidalita Himoya kremi - tashqi ta'sirotlardan teringizni muhofaza qiladi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Vucut/BARRIERCREAM.jpg",
    variants: [
      {
        id: "var-vidalita-114-1",
        name: "200 ML",
        sku: "VID-BAC-STD",
        colorCode: "#F0F8FF",
        price: 56000,
        batches: [
          { batchId: "LOT-VID-114", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-115",
    name: "VIDALITA BODY PEELING CREAM 200 ML",
    brand: "Vidalita Cosmetics",
    category: "Body",
    skuPrefix: "VID-BPC",
    description: "Vidalita Tana piling kremi - o'lik teri hujayralarini olib tashlab, teringizni yangilaydi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Vucut/BODYPEELING.jpg",
    variants: [
      {
        id: "var-vidalita-115-1",
        name: "200 ML",
        sku: "VID-BPC-STD",
        colorCode: "#FFE4E1",
        price: 60000,
        batches: [
          { batchId: "LOT-VID-115", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-116",
    name: "VIDALITA SHOWER GEL SEA MINERALS 340 ML",
    brand: "Vidalita Cosmetics",
    category: "Body",
    skuPrefix: "VID-SGS",
    description: "Vidalita Dengiz minerallari dush geli - dengiz minerallari bilan boyitilgan yuvish vositasi.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Vucut/SHOWERGELSEAMINERALS.jpg",
    variants: [
      {
        id: "var-vidalita-116-1",
        name: "340 ML",
        sku: "VID-SGS-STD",
        colorCode: "#D6EAF8",
        price: 46000,
        batches: [
          { batchId: "LOT-VID-116", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-117",
    name: "VIDALITA SHOWER GEL FURIT THERAPY 340 ML",
    brand: "Vidalita Cosmetics",
    category: "Body",
    skuPrefix: "VID-SGF",
    description: "Vidalita Meva terapiyasi dush geli - meva ekstraktlari bilan boyitilgan yumshoq dush geli.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Vucut/SHOWERGELFRUIT.jpg",
    variants: [
      {
        id: "var-vidalita-117-1",
        name: "340 ML",
        sku: "VID-SGF-STD",
        colorCode: "#FDE8D8",
        price: 46000,
        batches: [
          { batchId: "LOT-VID-117", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  },
  {
    id: "prod-vidalita-118",
    name: "VIDALITA SHOWER GEL OLIVE OIL 340 ML",
    brand: "Vidalita Cosmetics",
    category: "Body",
    skuPrefix: "VID-SGO",
    description: "Vidalita Zaytun moyi dush geli - zaytun moyi bilan boyitilgan terini namlantiruvchi dush geli.",
    reorderLevel: 5,
    isService: false,
    image: "/vidalita/Vucut/SHOWERGRLOLIVE.jpg",
    variants: [
      {
        id: "var-vidalita-118-1",
        name: "340 ML",
        sku: "VID-SGO-STD",
        colorCode: "#E8F5E9",
        price: 46000,
        batches: [
          { batchId: "LOT-VID-118", qty: 50, expiryDate: "2027-12-31", mfgDate: "2025-06-01" }
        ]
      }
    ]
  }
];

export const initialRawMaterials = [];

export const initialFormulations = [];

export const initialBundles = [];

export const initialChannels = [
  { id: "chan-1", name: "Physical Boutique Shop", type: "Offline", active: true, stockRatio: 0.5 },
  { id: "chan-2", name: "Online Shopify Store", type: "Online", active: true, stockRatio: 0.4 },
  { id: "chan-3", name: "Instagram DM/WhatsApp Shop", type: "Online", active: true, stockRatio: 0.1 }
];

export const initialLogs = [];

export const initialTransactions = [];
