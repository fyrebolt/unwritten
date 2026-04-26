export type DenialExtracted = {
  insurer: string;
  planType: string;
  memberId: string;
  serviceDenied: string;
  denialReason: string;
  appealDeadline: string;
};

export const emptyExtracted = (): DenialExtracted => ({
  insurer: "",
  planType: "",
  memberId: "",
  serviceDenied: "",
  denialReason: "",
  appealDeadline: "",
});
