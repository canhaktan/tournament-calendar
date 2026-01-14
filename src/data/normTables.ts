export interface NormRange {
    points: number;
    gm: { min: number; max?: number }; // max is optional for >= cases
    im: { min: number; max?: number };
}

export const NORM_TABLES: Record<number, NormRange[]> = {
    9: [
        { points: 7, gm: { min: 2380, max: 2433 }, im: { min: 2230, max: 2283 } },
        { points: 6.5, gm: { min: 2434, max: 2474 }, im: { min: 2284, max: 2324 } },
        { points: 6, gm: { min: 2475, max: 2519 }, im: { min: 2325, max: 2369 } },
        { points: 5.5, gm: { min: 2520, max: 2556 }, im: { min: 2370, max: 2406 } },
        { points: 5, gm: { min: 2557, max: 2599 }, im: { min: 2407, max: 2449 } },
        { points: 4.5, gm: { min: 2600, max: 2642 }, im: { min: 2450, max: 2492 } },
        { points: 4, gm: { min: 2643, max: 2679 }, im: { min: 2493, max: 2529 } },
        { points: 3.5, gm: { min: 2680 }, im: { min: 2530 } }
    ],
    10: [
        { points: 8, gm: { min: 2380, max: 2406 }, im: { min: 2230, max: 2256 } },
        { points: 7.5, gm: { min: 2407, max: 2450 }, im: { min: 2257, max: 2300 } },
        { points: 7, gm: { min: 2451, max: 2489 }, im: { min: 2301, max: 2339 } },
        { points: 6.5, gm: { min: 2490, max: 2527 }, im: { min: 2340, max: 2377 } },
        { points: 6, gm: { min: 2528, max: 2563 }, im: { min: 2378, max: 2413 } },
        { points: 5.5, gm: { min: 2564, max: 2599 }, im: { min: 2414, max: 2449 } },
        { points: 5, gm: { min: 2600, max: 2635 }, im: { min: 2450, max: 2485 } },
        { points: 4.5, gm: { min: 2636, max: 2671 }, im: { min: 2486, max: 2521 } },
        { points: 4, gm: { min: 2672, max: 2709 }, im: { min: 2522, max: 2559 } },
        { points: 3.5, gm: { min: 2710 }, im: { min: 2560 } }
    ],
    11: [
        { points: 9, gm: { min: 2380, max: 2388 }, im: { min: 2230, max: 2238 } },
        { points: 8.5, gm: { min: 2389, max: 2424 }, im: { min: 2239, max: 2274 } },
        { points: 8, gm: { min: 2425, max: 2466 }, im: { min: 2275, max: 2316 } },
        { points: 7.5, gm: { min: 2467, max: 2497 }, im: { min: 2317, max: 2347 } },
        { points: 7, gm: { min: 2498, max: 2534 }, im: { min: 2348, max: 2384 } },
        { points: 6.5, gm: { min: 2535, max: 2563 }, im: { min: 2385, max: 2413 } },
        { points: 6, gm: { min: 2564, max: 2599 }, im: { min: 2414, max: 2449 } },
        { points: 5.5, gm: { min: 2600, max: 2635 }, im: { min: 2450, max: 2485 } },
        { points: 5, gm: { min: 2636, max: 2664 }, im: { min: 2486, max: 2514 } },
        { points: 4.5, gm: { min: 2665, max: 2701 }, im: { min: 2515, max: 2551 } },
        { points: 4, gm: { min: 2702 }, im: { min: 2552 } }
    ]
};
