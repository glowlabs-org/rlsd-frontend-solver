import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReturnTypeOfGetApprovedQuoteGroups } from "@/db/queries";
import { Button } from "@/components/ui/button";

const View = ({
  data,
  totalApproved,
  totalScoutFee,
}: {
  data: ReturnTypeOfGetApprovedQuoteGroups;
  totalApproved: number;
  totalScoutFee: number;
}) => {
  return (
    <div className="p-4">
      <div className="font-bold text-lg mt-12">
        <h1>Total Approved Budget: ${totalApproved.toLocaleString()}</h1>
        <h2>Total Scout Fees: ${totalScoutFee.toLocaleString()}</h2>
      </div>
      <div className="flex">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote Group Id</TableHead>
              <TableHead>Farm Value</TableHead>
              <TableHead>Protocol Fee</TableHead>
              <TableHead>Install Fee</TableHead>
              <TableHead>Budget Consumed</TableHead>
              <TableHead>Scouting Fee</TableHead>
              <TableHead>Installer Value</TableHead>
              <TableHead>View</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((quoteGroup) => {
              return (
                <TableRow>
                  <TableCell>{quoteGroup.quoteGroupId}</TableCell>
                  <TableCell>
                    ${quoteGroup.quoteGroup.quotes[0].quote!.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    ${Number(quoteGroup.quoteGroup.protocolFees).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    ${quoteGroup.quoteGroup.installFixedFee.toLocaleString()}
                  </TableCell>

                  <TableCell>
                    $
                    {(
                      quoteGroup.quoteGroup.quotes[0].quote! +
                      parseFloat(
                        quoteGroup.quoteGroup.protocolFees.toString()
                      ) +
                      parseFloat(quoteGroup.quoteGroup.installFixedFee)
                    ).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    $
                    {(
                      quoteGroup.quoteGroup.quotes[0].quote! *
                      parseFloat(quoteGroup.quoteGroup.scoutingFee)
                    ).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    $
                    {(
                      quoteGroup.quoteGroup.quotes[0].quote! *
                      (1 - parseFloat(quoteGroup.quoteGroup.scoutingFee))
                    ).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    <a href={`/?groupId=${quoteGroup.quoteGroupId}`}>
                      <Button>View</Button>
                    </a>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default View;
