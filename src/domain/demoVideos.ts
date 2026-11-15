// src/domain/demoVideos.ts
/**
 * A real coach's demo video for each movement pattern, keyed like the motion demos. Picked from the
 * program's source creators where they have a clean demo (Squat University, Jeff Nippard, ATHLEAN-X,
 * Yellow Dude, Marcus Filly, Dr. Alyssa Lu), otherwise a short demo from a coach or physical therapist.
 * Patterns without a good match (scapular pull-down, Indian clubs) have no link.
 */
import type { DiagramType } from './exerciseVisualsData';

export interface DemoVideo {
  youtubeId: string;
  title: string;
  channel: string;
}

export const DEMO_VIDEOS: Partial<Record<DiagramType, DemoVideo>> = {
  squat: { youtubeId: '7v_V6xiA_AA', title: 'How to Perform a Back Squat', channel: 'Squat University' },
  split_squat: { youtubeId: 'g6KrlrOq4mw', title: 'Knees Over Toes Guy: ATG split squat', channel: 'Garage Strength' },
  tibialis: { youtubeId: 'VzIcGAgBiaM', title: 'Tibialis Wall Raises (Exercise Demo)', channel: 'The Barefoot Sprinter' },
  step_down: { youtubeId: 'DAOYK2kb-Tg', title: 'Patrick Step', channel: 'The Barefoot Sprinter' },
  core_mcgill: { youtubeId: 'S1QbyYZaXIg', title: 'McGill Big 3: The Bird Dog', channel: 'Northern Nevada Chiropractic' },
  side_bridge: { youtubeId: '2_e4I-brf0Y', title: 'McGill Big 3: The Side Bridge', channel: 'Northern Nevada Chiropractic' },
  bench_press: { youtubeId: 'vcBig73ojpE', title: 'Bench Press with Perfect Technique', channel: 'Jeff Nippard' },
  kb_row: { youtubeId: 'gfUg6qWohTk', title: 'One-Arm Row: Proper Form', channel: 'ATHLEAN-X' },
  floor_press: { youtubeId: 'B340QckIfJM', title: '1-Arm Kettlebell Floor Press Tutorial', channel: 'Luka Hocevar' },
  face_pull: { youtubeId: 'ljgqer1ZpXg', title: 'Face Pulls: Proper Form', channel: 'ATHLEAN-X' },
  dead_hang: { youtubeId: '-9OWV6kio94', title: 'The Daily Dead Hang', channel: 'ATHLEAN-X' },
  rdl: { youtubeId: '_oyxCn2iSjU', title: 'How to Do Romanian Deadlifts', channel: 'Jeff Nippard' },
  good_morning: { youtubeId: 'qxNuAQknYQI', title: 'How to Perform Good Mornings', channel: 'Squat University' },
  biering_sorensen: { youtubeId: '9trh_5GBrh8', title: 'Biering-Sorensen Test', channel: 'Make Yourself' },
  carry: { youtubeId: '3RKKnZhhelE', title: 'How to Perform a Suitcase Carry', channel: 'Champion Physical Therapy' },
  ohp: { youtubeId: '_RlRDWO2jfg', title: 'The Overhead Press: Perfect Technique', channel: 'Jeff Nippard' },
  pullup: { youtubeId: 'dAScZVF5o9k', title: 'Fix Your Pull-Ups in 2 Minutes', channel: 'Yellow Dude' },
  z_press: { youtubeId: 'zcUg776Cr2Q', title: 'Single-Arm Kettlebell Z Press', channel: 'Marcus Filly' },
  lsit: { youtubeId: 'pMwUNj_l2wg', title: 'The L-Sit, Explained', channel: 'Yellow Dude' },
  arms: { youtubeId: 'OPqe0kCxmR8', title: 'Hammer Curls: Correct Technique', channel: 'One Minute Tutorial' },
  warmup_walk: { youtubeId: 'k7JsvdG9sSo', title: 'Backward Sled Drag', channel: 'T Nation' },
  warmup_hip: { youtubeId: 'PmN-N3BtJcM', title: 'This One Exercise Fixed My Hips', channel: 'Dr. Alyssa Lu' },
  warmup_row: { youtubeId: '4zWu1yuJ0_g', title: 'Correct Rowing Machine Technique', channel: 'Concept2' },
  warmup_90_90: { youtubeId: 'QdkE6Tdgpvk', title: '90/90 Breathing for Back Health', channel: 'Zack Henderson' },
  warmup_calf: { youtubeId: 'gpa73t5B5gA', title: 'Slant Board Calf Raise (ATG Zero, Step 2)', channel: 'More Dates More Fiber' },
  warmup_ankle: { youtubeId: 'WBD8DJ2du8I', title: 'Ankle Rocks', channel: 'Resilience Physical Therapy' },
  warmup_elephant: { youtubeId: 'ru4Sr5Ad-Cg', title: 'Elephant Walks (Exercise Demo)', channel: 'The Barefoot Sprinter' },
  warmup_dead_hang: { youtubeId: 'V0hzdT1CZnk', title: 'Dead Hang Scapula Pulls', channel: 'Jacobs Fitness' },
  warmup_wall_slide: { youtubeId: 'tWDGEyMWv10', title: 'Scapula Wall Slides', channel: 'Jack Hanrahan Fitness' },
};

export function demoVideoFor(type: DiagramType | string | undefined): DemoVideo | null {
  return (type && (DEMO_VIDEOS as Record<string, DemoVideo>)[type]) || null;
}

export const youtubeUrl = (v: DemoVideo) => `https://www.youtube.com/watch?v=${v.youtubeId}`;
