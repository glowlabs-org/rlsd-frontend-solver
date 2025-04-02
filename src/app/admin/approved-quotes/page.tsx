import React from "react";
import {
  getApprovedQuoteGroups,
  ReturnTypeOfGetApprovedQuoteGroups,
} from "@/db/queries";
import View from "./view";
import { db } from "@/db/db";
import { getScoutingFee } from "@/app/api/compute/route";

export const dynamic = "force-dynamic";
export const revalidate = 1;

const Page = async () => {
  const approvedQuoteGroups: ReturnTypeOfGetApprovedQuoteGroups =
    await getApprovedQuoteGroups();
  const totalScoutFee =
    approvedQuoteGroups.reduce((acc, group) => {
      return acc + group.quoteGroup.quotes[0].quote;
    }, 0) * getScoutingFee();

  const totalApproved = await db.query.TotalBudgetGranted.findFirst({});
  return (
    <View
      totalApproved={parseFloat(totalApproved?.amount!) || 0}
      totalScoutFee={totalScoutFee}
      data={approvedQuoteGroups}
    />
  );
};

export default Page;
