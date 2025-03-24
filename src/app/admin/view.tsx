"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React from "react";
import { useQueries } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import {
  ReturnTypeOfApproveQuoteGroup,
  ReturnTypeOfGetQuoteGroup,
} from "@/db/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ADMIN_PASSWORD_HEADER_KEY } from "@/constants";
import { useCookie } from "react-use";
import { useRouter } from "next/navigation";
const View = () => {
  const [groupId, setGroupId] = React.useState<number | null>(null);
  const [passwordCookie] = useCookie(ADMIN_PASSWORD_HEADER_KEY);
  const router = useRouter();

  async function getQuoteGroupClientSide(id: number) {
    const get = await fetch(`/api/find-group-by-id?groupId=${id}`);
    if (get.status >= 400) {
      toast.error("Group not found");
      throw new Error("Group not found");
    }
    const data = await get.json();

    return data as ReturnTypeOfGetQuoteGroup;
  }
  const [findGroupQuery] = useQueries({
    queries: [
      {
        queryKey: ["findGroup", groupId],
        queryFn: () => getQuoteGroupClientSide(groupId as number),
        enabled: false,
        retry: false,
      },
    ],
  });

  const approveQuoteGroupMutationFN = async () => {
    if (!groupId) throw new Error("Group Id is required");
    if (!findGroupQuery.data) throw new Error("Group not found");
    const headers: HeadersInit = new Headers();

    if (!passwordCookie) {
      router.push("/auth/login");
      throw new Error("Password is required");
    }
    headers.set(ADMIN_PASSWORD_HEADER_KEY, passwordCookie);
    const get = await fetch(`/api/approve-quote-group?groupId=${groupId}`, {
      headers,
    });
    if (get.status === 401) throw new Error("Unauthorized");
    if (get.status >= 400) throw new Error("Group Id Already Approved");
    const data = await get.json();
    return data as ReturnTypeOfApproveQuoteGroup;
  };
  const approveQuoteGroupMutation = useMutation({
    mutationFn: approveQuoteGroupMutationFN,
    mutationKey: ["approveQuoteGroup", groupId],
    onSuccess: () => {
      toast.success("Successfully approved quote group");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  return (
    <div className="mt-12 px-4">
      <h1 className="text-lg uppercase font-bold">Find Group By Id</h1>
      <div className="flex gap-x-4 items-center ">
        <p>Group Id:</p>
        <Input
          type="number"
          className="w-48"
          placeholder="Enter Group Id"
          onChange={(e) => setGroupId(parseInt(e.target.value) as number)}
        />
      </div>
      <Button
        className="mt-4"
        onClick={() => {
          findGroupQuery.refetch();
        }}
      >
        {findGroupQuery.isLoading
          ? "Loading..."
          : findGroupQuery.isError
          ? "Error"
          : findGroupQuery.isSuccess
          ? "Success"
          : "Search"}
      </Button>

      {findGroupQuery.data && (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Electricity Price</TableHead>
                <TableHead>Power Output</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{findGroupQuery.data?.electricityPrice}</TableCell>
                <TableCell>{findGroupQuery.data?.powerOutput}</TableCell>
                <TableCell>{findGroupQuery.data?.lat}</TableCell>
                <TableCell>{findGroupQuery.data?.lon}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Farm Value</TableHead>
            <TableHead>Protocol Fee</TableHead>
            <TableHead>Install Fee</TableHead>
            <TableHead>Budget Consumed</TableHead>
            <TableHead>Scouting Fee</TableHead>
            <TableHead>Installer Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findGroupQuery.data?.quotes &&
            findGroupQuery.data.quotes.map((quote) => {
              return (
                <TableRow key={quote.id}>
                  <TableCell>
                    {new Date(
                      parseInt(quote.timestampToBenchmark) * 1000
                    ).toLocaleDateString()}
                  </TableCell>

                  <TableCell>
                    ${parseFloat(quote.quote!).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    $
                    {parseFloat(
                      findGroupQuery.data?.protocolFees
                    ).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    $
                    {parseFloat(findGroupQuery?.data.installFixedFee).toFixed(
                      2
                    )}
                  </TableCell>
                  <TableCell>
                    $
                    {(
                      parseFloat(quote.quote!) +
                      parseFloat(findGroupQuery.data?.protocolFees) +
                      parseFloat(findGroupQuery.data?.installFixedFee)
                    ).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    $
                    {(
                      parseFloat(quote.quote!) *
                      parseFloat(findGroupQuery.data?.scoutingFee)
                    ).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    $
                    {(
                      parseFloat(quote.quote!) *
                      (1 - parseFloat(findGroupQuery.data?.scoutingFee!))
                    ).toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
      <Button
        disabled={
          approveQuoteGroupMutation.isPending || !findGroupQuery.isSuccess
        }
        onClick={() => {
          //if success already don't call again
          if (approveQuoteGroupMutation.isPending) return;
          if (approveQuoteGroupMutation.isSuccess) return;
          approveQuoteGroupMutation.mutate();
        }}
        className="mt-4"
      >
        {approveQuoteGroupMutation.isPending
          ? "Loading..."
          : approveQuoteGroupMutation.isError
          ? "Error"
          : approveQuoteGroupMutation.isSuccess
          ? "Success"
          : "Approve"}
      </Button>
    </div>
  );
};

export default View;
