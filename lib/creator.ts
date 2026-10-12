/** Who built this site. Shown by the assistant's creator card; the model never writes these itself. */
export const CREATOR = {
  name: "P. Chaithanya",
  rollNumber: "2473A05185",
  department: "Computer Science and Engineering (CSE)",
  college: "PBR VITS",
} as const;

export type Creator = typeof CREATOR;
