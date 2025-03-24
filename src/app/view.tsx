"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useForm, Resolver } from "react-hook-form";
import { checkIfNumber } from "@/lib/check-if-number";
import { useRouter } from "next/navigation";
import { ThreeDots } from "react-loader-spinner";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FaChevronCircleLeft } from "react-icons/fa";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { metadata } from "@/constants/metadata";

export type Estimate = {
  estimate: number;
  timestamp: number;
};
const Loader = () => {
  return (
    <div className="flex flex-col gap-y-3">
      <strong>Calculating</strong>
      <ThreeDots
        visible={true}
        height="80"
        width="80"
        color="black"
        radius="9"
        ariaLabel="three-dots-loading"
        wrapperStyle={{}}
        wrapperClass=""
      />
    </div>
  );
};

type DisplayState = "input" | "loading" | "result" | "error";
type FormState = {
  electricityPrice: number;
  lat: number;
  long: number;
  systemOutput: number;
};

type SingleState = {
  title: string;
  description: string;
  placeholder: string;
  value: string | number | null;
  inputType: "number" | "text";
};
type StateKey =
  | "electricityPrice"
  | "lat"
  | "long"
  | "systemSize"
  | "systemOutput";
type Args = {
  estimates: Estimate[] | null;
  lat: number | null;
  long: number | null;
  electricityPrice: number | null;
  systemOutput: number | null;
  isApproved: boolean;
};
type State = Record<StateKey, SingleState>;
const View = (args: Args) => {
  const router = useRouter();
  const resolver: Resolver<FormState> = async (values) => {
    return {
      values: values,
      errors: {},
    };
  };
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const [displayState, setDisplayState] = useState<DisplayState>(
    args.estimates ? "result" : "input"
  );
  const { register, handleSubmit, formState, getValues, setValue } =
    useForm<FormState>({
      resolver,
    });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedToClipboard(true);
    //Set timeout
    toast.success("Copied to clipboard");
    setTimeout(() => {
      setCopiedToClipboard(false);
    }, 3000);
  };
  // const latLongMutation = useMutation({
  //   mutationFn: getLatLongFromZip,
  //   mutationKey: ["latLong"],
  // });

  async function getEstimateFarmValue(
    electricityPrice: number,
    systemOutput: number,
    systemSize: number,
    lat: number,
    long: number
  ) {
    const res = await fetch(
      `/api/compute?electricityPrice=${electricityPrice}&powerOutput=${systemOutput}&systemSize=${systemSize}&lat=${lat}&long=${long}`
    );
    const data = (await res.json()) as {
      estimates: { estimate: number; timestamp: number }[];
      quoteGroupId: number;
      totalBudget: number;
    };
    console.log("Total Impact On Budget = ", data.totalBudget);
    console.log({ data });
    //Router.push ?quoteGroupId
    router.push(`/?groupId=${data.quoteGroupId}`);
    return data;
  }
  const initialState: State = {
    electricityPrice: {
      title: "Electricity Price ($Per kWh)",
      description: "This is the price of electricity per kWh",
      placeholder: ".25",
      value: args.electricityPrice || 0.13,
      inputType: "number",
    },
    lat: {
      title: "Latitude",
      description: "The latitude coordinate of the location",
      placeholder: "33.0137",
      value: args.lat || 33.0137,
      inputType: "number",
    },
    long: {
      title: "Longitude",
      description: "The longitude coordinate of the location",
      placeholder: "-96.6984",
      value: args.long || -96.6984,
      inputType: "number",
    },
    systemSize: {
      title: "System Size (kW)",
      description: "This is the size of the solar system in kW",
      placeholder: "5",
      value: 44.24,
      inputType: "number",
    },
    systemOutput: {
      title: "System Output (kWh)",
      description: "This is the output of the solar system in kWh per year",
      placeholder: "500",
      value: args.systemOutput || 20_000,
      inputType: "number",
    },
  };

  const textToShowForResult = (result: number, date: Date) => {
    if (result <= 0) {
      return `${date.toLocaleDateString()} $0.00`;
    }
    return `${date.toLocaleDateString()}: $${Number(
      result.toFixed(2)
    ).toLocaleString()}`;
  };

  const estimateMutationFN = async () => {
    const electricityPriceForm =
      getValues("electricityPrice") || initialState.electricityPrice.value;
    const systemOutputForm =
      getValues("systemOutput") || initialState.systemOutput.value;
    const latForm = getValues("lat") || initialState.lat.value;
    const longForm = getValues("long") || initialState.long.value;

    console.log({ electricityPriceForm, systemOutputForm, latForm, longForm });
    const systemSize = initialState.systemSize.value;
    return await getEstimateFarmValue(
      electricityPriceForm as number,
      systemOutputForm as number,
      systemSize as number,
      latForm as number,
      longForm as number
    );
  };
  const estimateMutation = useMutation({
    mutationFn: () => estimateMutationFN(),
    mutationKey: ["estimate"],
  });

  useEffect(() => {
    if (estimateMutation.isSuccess) {
      setDisplayState("result");
    }
  }, [estimateMutation.isSuccess]);

  useEffect(() => {
    if (estimateMutation.isError) {
      setDisplayState("error");
      toast("Error calculating estimate. Check your inputs and try again.");
    }
  }, [estimateMutation.isError]);

  useEffect(() => {
    if (estimateMutation.isPending) {
      setDisplayState("loading");
    }
  }, [estimateMutation.isIdle]);
  useEffect(() => {
    if (estimateMutation.isPending) {
      setDisplayState("loading");
    }
  }, [estimateMutation.isPending]);

  function renderInputValue(val: string | number | null) {
    if (typeof val === "number") return val;
    if (val === null) return "";
    return val;
  }

  const getEstimates = () => {
    return estimateMutation.data?.estimates || args.estimates;
  };

  return (
    <>
      <div className="flex flex-col  justify-center gap-y-4">
        <div className="border relative  w-[90vw] md:w-[600px] bg-white  border-black rounded-lg ">
          <div className="flex flex-row items-center justify-center relative">
            {displayState === "result" && (
              <FaChevronCircleLeft
                onClick={() => {
                  setDisplayState("input");
                  router.push("/");
                }}
                className="absolute   size-5 left-2 cursor-pointer"
              />
            )}
            {/* <p>logo</p> */}
            <img className="max- h-[40px]" src={metadata.logo} />
          </div>
          {displayState === "loading" && (
            <div className="flex h-full absolute inset-0 w-full items-center justify-center">
              <Loader />
            </div>
          )}
          <div className="border-b h-[1px] border-black w-full" />
          {!(displayState === "result") && (
            <div className={`${estimateMutation.isPending && "invisible"}`}>
              <div className={`pl-3 mt-6 mb-3`}>
                {/* <div className={`${estimateMutation.isPending && "invisible"}`}> */}
                {/**Italics */}
                <p className="italic text-xl">
                  <strong>Carbon Credit Rewards Calculator</strong>
                </p>
              </div>
              <div className="border-b h-[1px] border-black w-full" />
              <div className="px-3 mt-5">
                <div className="">
                  <Label className="text-base  font-normal">
                    Electricity Price ($Per kWh)
                  </Label>
                  <input
                    defaultValue={initialState.electricityPrice.value as number}
                    onKeyDown={checkIfNumber}
                    type="number"
                    className="w-full outline-none h-10 border-b border-b-black  rounded-none "
                    {...register("electricityPrice", { valueAsNumber: true })}
                  />
                  <p>
                    <small className="italic">
                      {initialState.electricityPrice.description}
                    </small>
                  </p>
                </div>
                <div className="mt-4">
                  <Label className="text-base font-normal">Latitude</Label>
                  <input
                    type="number"
                    defaultValue={initialState.lat.value as number}
                    className="w-full h-10 border-b outline-none border-b-black  rounded-none "
                    {...register("lat", { valueAsNumber: true })}
                  />
                  <p>
                    <small className="italic">
                      {initialState.lat.description}
                    </small>
                  </p>
                </div>

                <div className="mt-4">
                  <Label className="text-base font-normal">Longitude</Label>
                  <input
                    type="number"
                    defaultValue={initialState.long.value as number}
                    className="w-full h-10 border-b outline-none border-b-black  rounded-none "
                    {...register("long", { valueAsNumber: true })}
                  />
                  <p>
                    <small className="italic">
                      {initialState.long.description}
                    </small>
                  </p>
                </div>

                <div className="mt-4">
                  <Label className="text-base font-normal">
                    System Output (kWh)
                  </Label>
                  <input
                    defaultValue={initialState.systemOutput.value as number}
                    onKeyDown={checkIfNumber}
                    type="number"
                    className="w-full h-10 border-b outline-none border-b-black  rounded-none "
                    {...register("systemOutput", { valueAsNumber: true })}
                  />
                  <p>
                    <small className="italic">
                      {initialState.systemOutput.description}
                    </small>
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  estimateMutation.mutate();
                }}
                className="w-full rounded-t-none mt-4"
              >
                Calculate
              </Button>
            </div>
          )}

          {displayState == "result" && (
            <>
              <div className={`pl-3 mt-6 mb-3`}>
                {/* <div className={`${estimateMutation.isPending && "invisible"}`}> */}
                {/**Italics */}
                {args.isApproved && (
                  <p className="  rounded-lg  text-center flex  text-green-600">
                    This estimate is approved
                  </p>
                )}
                <p className="italic text-xl">
                  <strong>Payout based on PTO date</strong>
                </p>
              </div>
              <div className="border-b h-[1px] border-black w-full" />
              {/**If the length is 0, have a message to contact admin */}
              {estimateMutation.data?.estimates.length === 0 && (
                <p className={`border p-2 text-sm rounded-lg mt-1`}>
                  Please contact the admin to reset the estimates
                </p>
              )}
              <div>
                <Table className="">
                  <TableCaption>
                    <Button
                      //Copy to clipboard and toast
                      onClick={copyToClipboard}
                      className="w-full"
                    >
                      {copiedToClipboard
                        ? "Copied to clipboard"
                        : "Copy link to clipboard"}
                    </Button>
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getEstimates()!.map((estimate, index) => {
                      return (
                        <TableRow
                          className="border-black "
                          key={estimate.timestamp}
                        >
                          <TableCell>
                            {new Date(
                              estimate.timestamp * 1000
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {`$${Number(
                              estimate.estimate.toFixed(2)
                            ).toLocaleString()}`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default View;

/* {stateKeys.map((key) => {
          //Don't loop over systemSize
          if (key === "systemSize") return null;
          const input = state[key as keyof State];
          return (
            <div key={key}>
              <Label>{input.title}</Label>
              <p>
                <small>{input.description}</small>
              </p>
              <Input
                type={input.inputType}
                className="w-full "
                // placeholder={input.placeholder}
                size={40}
                value={renderInputValue(input.value)}
                onChange={(e) =>
                //   handleChangeKey(key as keyof State, e.target.value)
                }
              />
            </div>
          );
        })}*/
