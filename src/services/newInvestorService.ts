/**
 * @deprecated Use investorCoreService — thin re-exports for legacy imports.
 */
export {
  commitInvestorProfile as initializeProfile,
  streamFounderPitchesForInvestorFeed as listenToLiveFounderPitches,
  saveInvestmentStageProgress as saveStageEvaluationData,
  submitPendingPaymentTransaction as submitPaymentProofReceipt,
  sendUnifiedChatMessage as sendContextualMessage,
  requireActiveInvestorUid,
  peekActiveInvestorUid,
} from "./investorCoreService";
