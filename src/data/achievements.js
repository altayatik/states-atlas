// Milestone categories (order drives the sections on the Milestones page).
export const achievementCategories = [
  { id: 'progress', label: 'The Long Haul', blurb: 'Raw states, coast to coast.' },
  { id: 'regions', label: 'Regions & Routes', blurb: 'Sweeps, loops and classic road trips.' },
  { id: 'frontiers', label: 'Frontiers', blurb: 'The far, the high and the non-contiguous.' },
  { id: 'cities', label: 'City Lights', blurb: 'Metros logged along the way.' },
  { id: 'parks', label: 'The Poster Wall', blurb: 'National parks stamped in the atlas.' },
  { id: 'favorites', label: 'Matters of the Heart', blurb: 'Favorites, overnights and second homes.' },
  { id: 'canada', label: 'North of the Border', blurb: 'Provinces, parks and Canadian cities.' },
]

export const achievements = [
  // ---- The Long Haul (raw state progress) -------------------------
  { id: 'first_3', name: 'Getting Started', icon: 'flag', accent: '#8fbf9a', category: 'progress', description: 'Log three visited states.', type: 'count', threshold: 3 },
  { id: 'first_5', name: 'First Five', icon: 'flag', accent: '#c67a54', category: 'progress', description: 'Log five visited states.', type: 'count', threshold: 5 },
  { id: 'first_10', name: 'Double Digits', icon: 'route', accent: '#ffe680', category: 'progress', description: 'Log ten visited states.', type: 'count', threshold: 10 },
  { id: 'fifteen_down', name: 'Fifteen Down', icon: 'route', accent: '#a9d6ff', category: 'progress', description: 'Log fifteen visited states.', type: 'count', threshold: 15 },
  { id: 'halfway_there', name: 'Halfway There', icon: 'gauge', accent: '#8edfd2', category: 'progress', description: 'Reach twenty-five visited states.', type: 'count', threshold: 25 },
  { id: 'thirty_five', name: 'Thirty-Five Club', icon: 'gauge', accent: '#c7b7ff', category: 'progress', description: 'Reach thirty-five visited states.', type: 'count', threshold: 35 },
  { id: 'forty_strong', name: 'Forty Strong', icon: 'trophy', accent: '#d8a52e', category: 'progress', description: 'Reach forty visited states.', type: 'count', threshold: 40 },
  { id: 'lower_48_legend', name: 'Lower 48 Legend', icon: 'trophy', accent: '#c7b7ff', category: 'progress', description: 'Visit every contiguous U.S. state.', type: 'contiguous' },
  { id: 'all_50', name: 'The Full Fifty', icon: 'stamp', accent: '#7ba185', category: 'progress', description: 'Visit every state in the atlas.', type: 'all_states' },

  // ---- Regions & Routes ------------------------------------------
  { id: 'coast_to_coast', name: 'Coast to Coast', icon: 'waves', accent: '#8edfd2', category: 'regions', description: 'Visit both California and New York.', type: 'states', requiredStates: ['CA', 'NY'] },
  { id: 'pacific_trio', name: 'Pacific Trio', icon: 'sparkles', accent: '#a9d6ff', category: 'regions', description: 'Visit California, Oregon, and Washington.', type: 'states', requiredStates: ['CA', 'OR', 'WA'] },
  { id: 'four_corners', name: 'Four Corners', icon: 'diamond', accent: '#7ba185', category: 'regions', description: 'Visit Arizona, Colorado, New Mexico, and Utah.', type: 'states', requiredStates: ['AZ', 'CO', 'NM', 'UT'] },
  { id: 'new_england_sweep', name: 'New England Sweep', icon: 'compass', accent: '#c7b7ff', category: 'regions', description: 'Visit all six New England states.', type: 'states', requiredStates: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT'] },
  { id: 'great_lakes_run', name: 'Great Lakes Run', icon: 'waves', accent: '#8edfd2', category: 'regions', description: 'Trace the Great Lakes route states.', type: 'states', requiredStates: ['MN', 'WI', 'IL', 'IN', 'MI', 'OH', 'PA', 'NY'] },
  { id: 'southern_swing', name: 'Southern Swing', icon: 'sun', accent: '#d8a52e', category: 'regions', description: 'Visit FL, GA, SC, NC, and TN.', type: 'states', requiredStates: ['FL', 'GA', 'SC', 'NC', 'TN'] },
  { id: 'deep_south', name: 'Deep South', icon: 'sun', accent: '#c67a54', category: 'regions', description: 'Visit Alabama, Mississippi, Louisiana, and Georgia.', type: 'states', requiredStates: ['AL', 'MS', 'LA', 'GA'] },
  { id: 'gulf_coast', name: 'Gulf Coast Cruise', icon: 'waves', accent: '#a9d6ff', category: 'regions', description: 'Visit TX, LA, MS, AL, and FL.', type: 'states', requiredStates: ['TX', 'LA', 'MS', 'AL', 'FL'] },
  { id: 'mid_atlantic', name: 'Mid-Atlantic', icon: 'compass', accent: '#8b80cc', category: 'regions', description: 'Visit NY, NJ, PA, DE, and MD.', type: 'states', requiredStates: ['NY', 'NJ', 'PA', 'DE', 'MD'] },
  { id: 'desert_run', name: 'Desert Run', icon: 'sun', accent: '#ffe680', category: 'regions', description: 'Visit CA, NV, AZ, UT, and NM.', type: 'states', requiredStates: ['CA', 'NV', 'AZ', 'UT', 'NM'] },
  { id: 'mountain_time', name: 'Mountain Time', icon: 'mountain', accent: '#a8e6c3', category: 'regions', description: 'Visit CO, WY, MT, ID, and UT.', type: 'states', requiredStates: ['CO', 'WY', 'MT', 'ID', 'UT'] },
  { id: 'the_dakotas', name: 'The Dakotas', icon: 'diamond', accent: '#8fbf9a', category: 'regions', description: 'Visit both North and South Dakota.', type: 'states', requiredStates: ['ND', 'SD'] },
  { id: 'heartland', name: 'Heartland', icon: 'route', accent: '#d8a52e', category: 'regions', description: 'Visit Iowa, Kansas, Nebraska, and Missouri.', type: 'states', requiredStates: ['IA', 'KS', 'NE', 'MO'] },
  { id: 'route_66', name: 'Get Your Kicks', icon: 'route', accent: '#c67a54', category: 'regions', description: 'Follow Route 66: IL, MO, OK, TX, NM, AZ, CA.', type: 'states', requiredStates: ['IL', 'MO', 'OK', 'TX', 'NM', 'AZ', 'CA'] },
  { id: 'go_west', name: 'Go West', icon: 'mountain', accent: '#7ba185', category: 'regions', description: 'Visit ten states across the West.', type: 'region', region: 'West', threshold: 10 },
  { id: 'midwest_roots', name: 'Midwest Roots', icon: 'tree', accent: '#8fbf9a', category: 'regions', description: 'Visit eight Midwestern states.', type: 'region', region: 'Midwest', threshold: 8 },
  { id: 'the_south', name: 'Way Down South', icon: 'sun', accent: '#d8a52e', category: 'regions', description: 'Visit twelve Southern states.', type: 'region', region: 'South', threshold: 12 },
  { id: 'the_northeast', name: 'Northeast Corridor', icon: 'compass', accent: '#a9d6ff', category: 'regions', description: 'Visit seven Northeastern states.', type: 'region', region: 'Northeast', threshold: 7 },

  // ---- Frontiers -------------------------------------------------
  { id: 'island_hopper', name: 'Island Hopper', icon: 'island', accent: '#8edfd2', category: 'frontiers', description: 'Set foot in Hawaii.', type: 'states', requiredStates: ['HI'] },
  { id: 'last_frontier', name: 'Last Frontier', icon: 'mountain', accent: '#c7b7ff', category: 'frontiers', description: 'Set foot in Alaska.', type: 'states', requiredStates: ['AK'] },
  { id: 'non_contiguous', name: 'Non-Contiguous Club', icon: 'sparkles', accent: '#8b80cc', category: 'frontiers', description: 'Visit both Alaska and Hawaii.', type: 'states', requiredStates: ['AK', 'HI'] },
  { id: 'sea_to_shining', name: 'Sea to Shining Sea', icon: 'waves', accent: '#a9d6ff', category: 'frontiers', description: 'Reach the Pacific and Atlantic coasts (CA + ME).', type: 'states', requiredStates: ['CA', 'ME'] },

  // ---- City Lights -----------------------------------------------
  { id: 'city_starter', name: 'City Starter', icon: 'pin', accent: '#a8e6c3', category: 'cities', description: 'Log five cities or metros.', type: 'cities', threshold: 5 },
  { id: 'city_dozen', name: 'Baker’s Dozen', icon: 'pin', accent: '#a9d6ff', category: 'cities', description: 'Log thirteen cities or metros.', type: 'cities', threshold: 13 },
  { id: 'city_collector', name: 'City Collector', icon: 'pin', accent: '#8edfd2', category: 'cities', description: 'Log twenty cities or metros.', type: 'cities', threshold: 20 },
  { id: 'city_thirty', name: 'Frequent Flyer', icon: 'sparkles', accent: '#c7b7ff', category: 'cities', description: 'Log thirty cities or metros.', type: 'cities', threshold: 30 },
  { id: 'metro_maven', name: 'Metro Maven', icon: 'trophy', accent: '#d8a52e', category: 'cities', description: 'Log fifty cities or metros.', type: 'cities', threshold: 50 },

  // ---- The Poster Wall (parks) -----------------------------------
  { id: 'park_first', name: 'First Trailhead', icon: 'tree', accent: '#8fbf9a', category: 'parks', description: 'Mark your first national park.', type: 'parks', threshold: 1 },
  { id: 'park_five', name: 'Five Field Posters', icon: 'tree', accent: '#a8e6c3', category: 'parks', description: 'Mark five national parks.', type: 'parks', threshold: 5 },
  { id: 'park_chaser', name: 'National Park Chaser', icon: 'mountain', accent: '#7ba185', category: 'parks', description: 'Mark ten national parks.', type: 'parks', threshold: 10 },
  { id: 'park_fifteen', name: 'Ranger in Training', icon: 'star', accent: '#d8a52e', category: 'parks', description: 'Mark fifteen national parks.', type: 'parks', threshold: 15 },
  { id: 'park_twenty', name: 'Poster Wall', icon: 'trophy', accent: '#c67a54', category: 'parks', description: 'Mark twenty national parks.', type: 'parks', threshold: 20 },
  { id: 'park_legend', name: 'Park Legend', icon: 'trophy', accent: '#ffe680', category: 'parks', description: 'Mark twenty-five national parks.', type: 'parks', threshold: 25 },

  // ---- Matters of the Heart --------------------------------------
  { id: 'first_favorite', name: 'Love at First Sight', icon: 'star', accent: '#c67a54', category: 'favorites', description: 'Mark your first favorite state.', type: 'favorites', threshold: 1 },
  { id: 'gold_star', name: 'Gold Star Traveler', icon: 'star', accent: '#ffe680', category: 'favorites', description: 'Mark five states as favorites.', type: 'favorites', threshold: 5 },
  { id: 'hopeless_romantic', name: 'Hopeless Romantic', icon: 'sparkles', accent: '#c7b7ff', category: 'favorites', description: 'Mark ten states as favorites.', type: 'favorites', threshold: 10 },
  { id: 'stayed_a_while', name: 'Stayed a While', icon: 'compass', accent: '#8fbf9a', category: 'favorites', description: 'Stay overnight in ten states.', type: 'stayed', threshold: 10 },
  { id: 'second_home', name: 'Second Home', icon: 'flag', accent: '#8b80cc', category: 'favorites', description: 'Mark a state as “lived there.”', type: 'lived', threshold: 1 },

  // ---- North of the Border (Canada) ------------------------------
  { id: 'canada_stamp', name: 'Canada Stamp', icon: 'stamp', accent: '#8b80cc', category: 'canada', description: 'Log one Canadian province or territory.', type: 'canada_subdivisions', threshold: 1 },
  { id: 'canada_province_sampler', name: 'Province Sampler', icon: 'compass', accent: '#a9d6ff', category: 'canada', description: 'Log two Canadian provinces or territories.', type: 'canada_subdivisions', threshold: 2 },
  { id: 'canada_halfway', name: 'Cross-Canada Run', icon: 'route', accent: '#c7b7ff', category: 'canada', description: 'Log five Canadian provinces or territories.', type: 'canada_subdivisions', threshold: 5 },
  { id: 'canadian_park_starter', name: 'Canadian Park Starter', icon: 'tree', accent: '#8fbf9a', category: 'canada', description: 'Mark one Canadian national park.', type: 'canada_parks', threshold: 1 },
  { id: 'canadian_park_trail', name: 'Rockies Ranger', icon: 'mountain', accent: '#a8e6c3', category: 'canada', description: 'Mark three Canadian national parks.', type: 'canada_parks', threshold: 3 },
  { id: 'north_of_border_city', name: 'North of the Border', icon: 'pin', accent: '#c67a54', category: 'canada', description: 'Log one Canadian city.', type: 'canada_cities', threshold: 1 },
]
