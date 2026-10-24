/**
 * Sample data for the design preview (/design-preview). Numbers are Driven's October 1 to 14, 2026
 * results, so the layout can be judged with realistic values. Drill-down rows are made up.
 * Do not use in production pages.
 */
import { toFpKpis, type EngineKpiResult } from "./format";
import type { FpKpiSetting, FpParityRow, FpReview, FpTech } from "./types";

interface RawTech {
  id: string; name: string; photoUrl: string; branch: string; role: string; rank: number; proscore: number;
  driving: number; drivingP: number; reservice: number; reserviceP: number; prod: number; prodP: number;
  comp: number; compP: number; stars: number; starsP: number; paced: number;
  history: { label: string; score: number }[];
}

const RAW: RawTech[] = [
 {
  "id": "aldo",
  "name": "Aldo Guerrero",
  "photoUrl": "/photos/Aldo Guerrero.jpg",
  "branch": "Boise",
  "role": "Technician",
  "rank": 1,
  "proscore": 94,
  "driving": 93.0,
  "drivingP": 1.0,
  "reservice": 1.8,
  "reserviceP": 1.0,
  "prod": 164.0,
  "prodP": 0.82,
  "comp": 85.0,
  "compP": 0.94,
  "stars": 3,
  "starsP": 0.949,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 92
   },
   {
    "label": "Sep",
    "score": 91
   },
   {
    "label": "Oct",
    "score": 94
   }
  ]
 },
 {
  "id": "larry",
  "name": "Larry Alexander",
  "photoUrl": "/photos/Larry Alexander.jpg",
  "branch": "Boise",
  "role": "Technician",
  "rank": 2,
  "proscore": 93,
  "driving": 95.0,
  "drivingP": 1.0,
  "reservice": 3.1,
  "reserviceP": 1.0,
  "prod": 149.0,
  "prodP": 0.75,
  "comp": 80.0,
  "compP": 0.89,
  "stars": 7,
  "starsP": 1,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 92
   },
   {
    "label": "Sep",
    "score": 93
   },
   {
    "label": "Oct",
    "score": 93
   }
  ]
 },
 {
  "id": "arturo",
  "name": "Arturo Lopez",
  "photoUrl": "/photos/Arturo Lopez.jpg",
  "branch": "Boise",
  "role": "Technician",
  "rank": 3,
  "proscore": 91,
  "driving": 95.0,
  "drivingP": 1.0,
  "reservice": 3.2,
  "reserviceP": 1.0,
  "prod": 143.0,
  "prodP": 0.72,
  "comp": 74.0,
  "compP": 0.82,
  "stars": 5,
  "starsP": 1,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 90
   },
   {
    "label": "Sep",
    "score": 91
   },
   {
    "label": "Oct",
    "score": 91
   }
  ]
 },
 {
  "id": "chris",
  "name": "Chris Bogardus",
  "photoUrl": "/photos/Chris Bogardus.jpg",
  "branch": "Boise",
  "role": "Technician",
  "rank": 3,
  "proscore": 91,
  "driving": 100.0,
  "drivingP": 1.0,
  "reservice": 4.5,
  "reserviceP": 1.0,
  "prod": 209.0,
  "prodP": 1.0,
  "comp": 82.0,
  "compP": 0.91,
  "stars": 2,
  "starsP": 0.6327,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 93
   },
   {
    "label": "Sep",
    "score": 94
   },
   {
    "label": "Oct",
    "score": 91
   }
  ]
 },
 {
  "id": "justin",
  "name": "Justin Montgomery",
  "photoUrl": "/photos/Justin Montgomery.jpg",
  "branch": "Boise",
  "role": "Technician",
  "rank": 3,
  "proscore": 91,
  "driving": 97.0,
  "drivingP": 1.0,
  "reservice": 3.4,
  "reserviceP": 1.0,
  "prod": 141.0,
  "prodP": 0.71,
  "comp": 75.0,
  "compP": 0.83,
  "stars": 4,
  "starsP": 1,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 93
   },
   {
    "label": "Sep",
    "score": 92
   },
   {
    "label": "Oct",
    "score": 91
   }
  ]
 },
 {
  "id": "noah-w",
  "name": "Noah Walters",
  "photoUrl": "/photos/Noah Walters.jpg",
  "branch": "Boise",
  "role": "Technician",
  "rank": 3,
  "proscore": 91,
  "driving": 100.0,
  "drivingP": 1.0,
  "reservice": 1.1,
  "reserviceP": 1.0,
  "prod": 147.0,
  "prodP": 0.74,
  "comp": 79.0,
  "compP": 0.88,
  "stars": 3,
  "starsP": 0.949,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 85
   },
   {
    "label": "Sep",
    "score": 89
   },
   {
    "label": "Oct",
    "score": 91
   }
  ]
 },
 {
  "id": "troy",
  "name": "Troy Winter",
  "photoUrl": "/photos/Troy Winter.jpg",
  "branch": "Boise",
  "role": "Technician",
  "rank": 3,
  "proscore": 91,
  "driving": 89.0,
  "drivingP": 0.99,
  "reservice": 2.3,
  "reserviceP": 1.0,
  "prod": 133.0,
  "prodP": 0.67,
  "comp": 79.0,
  "compP": 0.88,
  "stars": 4,
  "starsP": 1,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 93
   },
   {
    "label": "Sep",
    "score": 84
   },
   {
    "label": "Oct",
    "score": 91
   }
  ]
 },
 {
  "id": "david",
  "name": "David Cox",
  "photoUrl": "/photos/David Cox.jpg",
  "branch": "Boise",
  "role": "Service Manager",
  "rank": 4,
  "proscore": 90,
  "driving": 96.0,
  "drivingP": 1.0,
  "reservice": 3.8,
  "reserviceP": 1.0,
  "prod": 114.0,
  "prodP": 0.57,
  "comp": 86.0,
  "compP": 0.96,
  "stars": 3,
  "starsP": 0.949,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 89
   },
   {
    "label": "Sep",
    "score": 92
   },
   {
    "label": "Oct",
    "score": 90
   }
  ]
 },
 {
  "id": "jake",
  "name": "Jake Rowe",
  "photoUrl": "/photos/Jake Rowe.png",
  "branch": "Boise",
  "role": "Technician",
  "rank": 4,
  "proscore": 90,
  "driving": 100.0,
  "drivingP": 1.0,
  "reservice": 2.3,
  "reserviceP": 1.0,
  "prod": 132.0,
  "prodP": 0.66,
  "comp": 76.0,
  "compP": 0.84,
  "stars": 6,
  "starsP": 1,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 92
   },
   {
    "label": "Sep",
    "score": 92
   },
   {
    "label": "Oct",
    "score": 90
   }
  ]
 },
 {
  "id": "noah-c",
  "name": "Noah Calvert",
  "photoUrl": "/photos/Noah Calvert.jpg",
  "branch": "Boise",
  "role": "Technician",
  "rank": 5,
  "proscore": 89,
  "driving": 97.0,
  "drivingP": 1.0,
  "reservice": 1.6,
  "reserviceP": 1.0,
  "prod": 131.0,
  "prodP": 0.66,
  "comp": 75.0,
  "compP": 0.83,
  "stars": 3,
  "starsP": 0.949,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 94
   },
   {
    "label": "Sep",
    "score": 85
   },
   {
    "label": "Oct",
    "score": 89
   }
  ]
 },
 {
  "id": "lucca",
  "name": "Lucca Dianda-Guiod",
  "photoUrl": "/photos/Lucca.png",
  "branch": "Boise",
  "role": "Technician",
  "rank": 6,
  "proscore": 83,
  "driving": 98.0,
  "drivingP": 1.0,
  "reservice": 5.1,
  "reserviceP": 1.0,
  "prod": 168.0,
  "prodP": 0.84,
  "comp": 91.0,
  "compP": 1.0,
  "stars": 1,
  "starsP": 0.3163,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 80
   },
   {
    "label": "Sep",
    "score": 89
   },
   {
    "label": "Oct",
    "score": 83
   }
  ]
 },
 {
  "id": "marc",
  "name": "Marc Rodriguez",
  "photoUrl": "/photos/Marc Rodriguez.jpg",
  "branch": "Boise",
  "role": "Lead Tech",
  "rank": 7,
  "proscore": 72,
  "driving": 93.0,
  "drivingP": 1.0,
  "reservice": 5.6,
  "reserviceP": 1.0,
  "prod": 148.0,
  "prodP": 0.74,
  "comp": 78.0,
  "compP": 0.87,
  "stars": 0,
  "starsP": 0.0,
  "paced": 3.16,
  "history": [
   {
    "label": "Aug",
    "score": 76
   },
   {
    "label": "Sep",
    "score": 83
   },
   {
    "label": "Oct",
    "score": 72
   }
  ]
 }
];

export const SAMPLE_MONTH = { label: "October 2026", progress: "Day 14 of 31", period: "October 2026 · Day 14 of 31", updated: "Updated 9:05 AM" };

function kpisFor(t: RawTech) {
  const results: EngineKpiResult[] = [
    { key: "driving", actual: t.driving, goal: 90, pacedGoal: null, progress: t.drivingP, pointsOutOf100: t.drivingP * 100 },
    { key: "reservice", actual: t.reservice, goal: 10, pacedGoal: null, progress: t.reserviceP, pointsOutOf100: t.reserviceP * 100 },
    { key: "prod_hr", actual: t.prod, goal: 200, pacedGoal: null, progress: t.prodP, pointsOutOf100: t.prodP * 100 },
    { key: "completion", actual: t.comp, goal: 90, pacedGoal: null, progress: t.compP, pointsOutOf100: t.compP * 100 },
    { key: "stars", actual: t.stars, goal: 7, pacedGoal: t.paced, progress: t.starsP, pointsOutOf100: t.starsP * 100 },
  ];
  const services = Math.round(120 * (t.comp / 85));
  const resv = Math.round((t.reservice / 100) * services);
  return toFpKpis(results, { driving: 20, reservice: 20, prod_hr: 20, completion: 20, stars: 20 }, {
    driving: {
      detail: "Built from hard braking and hard starts per 100 miles in your truck.",
      drill: { title: "See driving events by week", columns: ["Week", "Miles", "Hard brakes", "Hard starts"], rows: [["Oct 1 to 4", 212, 1, 0], ["Oct 5 to 11", 388, 2, 1], ["Oct 12 to 14", 141, 0, 1]], note: "Sample rows for the design preview." },
    },
    reservice: {
      detail: `${resv} reservice${resv === 1 ? "" : "s"} charged to you on ${services} completed services.`,
      drill: { title: `See the ${resv} reservice${resv === 1 ? "" : "s"} charged to you`, columns: ["Reservice date", "Account", "Original service", "Done by"], rows: Array.from({ length: Math.min(resv, 4) }, (_, i) => [`Oct ${3 + i * 3}`, `#${30112 + i * 417}`, `General Pest · Sep ${12 + i * 4}`, i % 2 ? "Another tech" : "You"]), note: "A reservice counts against the tech who did the last regular service in the same category. Sample rows." },
    },
    prod_hr: {
      detail: "Production from completed services divided by your time on site (check-in to check-out).",
      drill: { title: "See production by service type", columns: ["Service type", "Jobs", "Production", "Hours on site"], rows: [["General Pest Quarterly", 74, "$4,810", "31.2"], ["Initial Service", 6, "$1,140", "6.5"], ["Mosquito", 18, "$990", "6.1"]], note: "Sample rows for the design preview." },
    },
    completion: {
      detail: `${Math.round((t.comp / 100) * services)} of ${services} scheduled appointments completed.`,
      drill: { title: "See appointments by status", columns: ["Status", "Count"], rows: [["Completed", Math.round((t.comp / 100) * services)], ["Rescheduled", Math.max(1, Math.round(services * (1 - t.comp / 100) * 0.7))], ["Cancelled", Math.max(0, Math.round(services * (1 - t.comp / 100) * 0.3))]], note: "Sample rows for the design preview." },
    },
    stars: {
      detail: `${t.stars} five-star review${t.stars === 1 ? "" : "s"} so far. The goal grows through the month: ${t.paced.toFixed(1)} expected by today.`,
    },
  });
}

export const SAMPLE_TECHS: FpTech[] = RAW.map((t) => ({
  id: t.id, name: t.name, photoUrl: t.photoUrl, branch: t.branch, role: t.role,
  rank: t.rank, proscore: t.proscore, kpis: kpisFor(t), href: `/design-preview/tech/${t.id}`, history: t.history,
}));

export const SAMPLE_REVIEWS: FpReview[] = [
  { id: "r1", source: "Google", location: "Meridian", author: "Jenna Q.", stars: 5, date: "Oct 10", text: "Bigfoot never disappoints. Our tech was great and the bugs are gone.", autoTechId: null, autoReason: "No tech named" },
  { id: "r2", source: "Google", location: "Boise", author: "Scott L.", stars: 5, date: "Oct 11", text: "Larry and Aldo came out together and handled the whole house in an hour.", autoTechId: null, autoReason: "Names Larry and Aldo" },
  { id: "r3", source: "Google", location: "Nampa", author: "Whitney R.", stars: 4, date: "Oct 11", text: "Arturro was great, very friendly. Would recommend.", autoTechId: null, autoReason: "No tech named" },
  { id: "r4", source: "Google", location: "Meridian", author: "Hannah L.", stars: 5, date: "Oct 9", text: "Chris is the best tech we've had. He actually listens.", autoTechId: "chris", autoReason: "Name in review" },
  { id: "r5", source: "FieldRoutes", author: "Dale P.", stars: 5, date: "Oct 8", text: "Fast and friendly. Spiders are finally gone from the garage.", autoTechId: "aldo", autoReason: "FieldRoutes appointment" },
  { id: "r6", source: "Google", location: "Boise", author: "Alan H.", stars: 5, date: "Oct 12", text: "Kelsey at the front desk got us scheduled the same day. Awesome customer service.", autoTechId: null, autoReason: "No tech named", manualTechId: "none" },
];

export const SAMPLE_SETTINGS: FpKpiSetting[] = [
  { key: "driving", label: "Driving Score", source: "Bouncie", rule: "higher is better", enabled: true, goal: 90, weight: 20 },
  { key: "reservice", label: "Reservice Rate", source: "FieldRoutes", rule: "lower is better", enabled: true, goal: 10, weight: 20 },
  { key: "prod_hr", label: "Production / Hour", source: "FieldRoutes", rule: "higher is better", enabled: true, goal: 200, weight: 20 },
  { key: "completion", label: "Completion", source: "FieldRoutes", rule: "higher is better", enabled: true, goal: 90, weight: 20 },
  { key: "stars", label: "5-Star Reviews", source: "Reviews", rule: "monthly total, paced by day", enabled: true, goal: 7, weight: 20 },
  { key: "attendance", label: "Attendance", source: "Attendance log", rule: "higher is better", enabled: false, goal: 100, weight: 0, private: true },
];

export const SAMPLE_PARITY: FpParityRow[] = SAMPLE_TECHS.map((t, i) => ({
  techId: t.id, name: t.name, ours: t.proscore, driven: i < 9 ? t.proscore + ([0, 1, -1, 0, 2, 0, -1, 4, 0][i] ?? 0) : null,
}));
