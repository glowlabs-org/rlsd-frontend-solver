import { elysiaClient } from "@/api/elysiaClient";
import { DEFAULT_INSTALL_FEE } from "@/constants";
import { createQuoteGroup } from "@/db/queries";
import { InsertQuoteGroup, InsertQuoteSingle } from "@/db/schema";
// const DEFAULT_SCOUTING_FEE = 0.2;

// Rate limiting implementation
const RATE_LIMIT = 1; // 1 request per second
const RATE_WINDOW = 1000; // 1 second in milliseconds
let lastRequestTimestamp = 0;
let requestCount = 0;

// Rate limiter function
function checkRateLimit() {
  const now = Date.now();

  // Reset counter if we're in a new time window
  if (now - lastRequestTimestamp > RATE_WINDOW) {
    lastRequestTimestamp = now;
    requestCount = 0;
  }

  // Check if we've exceeded the rate limit
  if (requestCount >= RATE_LIMIT) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Increment the counter
  requestCount++;
}

const startingDateTimestamp = Date.now() / 1000;
export const getScoutingFee = (): number => {
  const scoutingFee = process.env.SCOUTING_FEE;
  if (!scoutingFee) throw new Error("process.env.SCOUTING_FEE is not defined");
  console.log(`env scouting fee = ${scoutingFee}`);
  const float = parseFloat(scoutingFee);
  if (isNaN(float)) throw new Error("SCOUTING_FEE is not a number");
  return float;
};
const formulaConstants = {
  maximumElectricityPrice: 0.097, // 9.7 cents
  protocolFeeValueMultiplier: 1.5,
  startingDateTimestamp: startingDateTimestamp,
  //   targetTimestamp: startingDateTimestamp + 86400 * 7 * 4, //it's starting date + 4 weeks
  decayPerDay: 0.0005, //.05%,
  scoutingFee: getScoutingFee(),
  protocolFeeInterestRate: 0.055, // 5.5%,
};

type EstimateFarmValueArgs = {
  powerOutputKWHPerYear: number;
  timestampToBenchmark: number;
  electricityPricePerKWH: number;
  carbonCreditEffectiveness: number;
};

type EstimateProtocolFeeArgs = {
  electricityPricePerKWH: number;
  powerOutputKWHPerYear: number;
};

type RunEstimationArgs = {
  powerOutputKWHPerYear: number;
  electricityPricePerKWH: number;
  lat: number;
  long: number;
};

type FarmValueEstimateAndTimestamp = {
  estimate: number;
  timestamp: number;
};
class FarmEstimator {
  public static estimateFarmValue(args: EstimateFarmValueArgs) {
    const a = args.powerOutputKWHPerYear;
    const daysBetweenNowAndTarget = Math.floor(
      (args.timestampToBenchmark - formulaConstants.startingDateTimestamp) /
        86400
    );
    const b =
      formulaConstants.maximumElectricityPrice *
      (1 - formulaConstants.decayPerDay) ** daysBetweenNowAndTarget;

    const c =
      a * (b * args.carbonCreditEffectiveness - args.electricityPricePerKWH);
    const d =
      formulaConstants.protocolFeeValueMultiplier *
      formulaConstants.protocolFeeInterestRate;
    const answer = c / d;
    return Math.ceil(answer);
  }

  public static estimateProtocolFees(args: EstimateProtocolFeeArgs) {
    const pricePerKwh = 1 / formulaConstants.protocolFeeInterestRate;
    const cost =
      args.electricityPricePerKWH * args.powerOutputKWHPerYear * pricePerKwh;
    return Math.ceil(cost);
  }

  public static async runEstimation(args: RunEstimationArgs) {
    const farmValueEstimtesAndTimestamps: FarmValueEstimateAndTimestamp[] = [];
    const startTimestamp = formulaConstants.startingDateTimestamp;

    const res = await elysiaClient.protocolFees.sunlightAndCertificates.get({
      $query: {
        latitude: args.lat.toString(),
        longitude: args.long.toString(),
      },
    });

    if (!res.data?.average_carbon_certificates)
      throw new Error("No Carbon Certificate Data");
    const carbonCreditEffectiveness = res.data?.average_carbon_certificates!;
    console.log({ carbonCreditEffectiveness });
    for (let i = 0; ; ++i) {
      const timestampToBenchmark = startTimestamp + 86400 * 14 * i;
      let estimate = this.estimateFarmValue({
        powerOutputKWHPerYear: args.powerOutputKWHPerYear,
        timestampToBenchmark,
        electricityPricePerKWH: args.electricityPricePerKWH,
        carbonCreditEffectiveness: carbonCreditEffectiveness,
      });
      console.log({
        estimate,
        args: {
          powerOutputKWHPerYear: args.powerOutputKWHPerYear,
          timestampToBenchmark,
          electricityPricePerKWH: args.electricityPricePerKWH,
          carbonCreditEffectiveness: carbonCreditEffectiveness,
        },
      });
      //Push

      if (estimate <= 0) {
        estimate = 0;
      }
      farmValueEstimtesAndTimestamps.push({
        estimate: estimate,
        timestamp: timestampToBenchmark,
      });
      if (estimate <= 0) {
        break;
      }
    }
    const protocolFees = this.estimateProtocolFees(args);
    console.log({ protocolFees });
    return {
      farmValueEstimtesAndTimestamps,
      protocolFees,
      lat: args.lat,
      long: args.long,
      carbonCreditEffectiveness,
    };
  }
}

export async function GET(request: Request) {
  try {
    // Apply rate limiting
    checkRateLimit();

    const { searchParams } = new URL(request.url);
    const powerOutputKWHPerYear = searchParams.get("powerOutput");
    const electricityPricePerKWH = searchParams.get("electricityPrice");
    const lat = searchParams.get("lat");
    const long = searchParams.get("long");

    if (!powerOutputKWHPerYear) throw new Error("powerOutput is required");
    if (!electricityPricePerKWH)
      throw new Error("electricityPrice is required");
    if (!lat) throw new Error("lat is required");
    if (!long) throw new Error("long is required");

    const args: RunEstimationArgs = {
      powerOutputKWHPerYear: parseFloat(powerOutputKWHPerYear!),
      electricityPricePerKWH: parseFloat(electricityPricePerKWH!),
      lat: parseFloat(lat!),
      long: parseFloat(long!),
    };

    const {
      farmValueEstimtesAndTimestamps,
      protocolFees,
      lat: resultLat,
      long: resultLong,
      carbonCreditEffectiveness,
    } = await FarmEstimator.runEstimation(args);
    const quotes: InsertQuoteSingle[] = farmValueEstimtesAndTimestamps.map(
      ({ estimate, timestamp }) => ({
        quote: estimate,
        timestampToBenchmark: timestamp.toString(),
        installFixedFee: DEFAULT_INSTALL_FEE.toFixed(4),
      })
    );
    console.log({ formulaConstants });
    const group: InsertQuoteGroup = {
      electricityPrice: args.electricityPricePerKWH.toFixed(4),
      powerOutput: args.powerOutputKWHPerYear,
      systemSize: (44.14).toFixed(4),
      zipCode: "", // Empty string as we no longer use zip code
      maximumElectricityPrice:
        formulaConstants.maximumElectricityPrice.toFixed(4),
      protocolFeeValueMultiplier:
        formulaConstants.protocolFeeValueMultiplier.toFixed(4),
      startingDateTimestamp: formulaConstants.startingDateTimestamp.toFixed(4),
      targetTimestamp: formulaConstants.startingDateTimestamp.toFixed(4),
      decayPerDay: formulaConstants.decayPerDay.toFixed(4),
      scoutingFee: formulaConstants.scoutingFee.toFixed(4),
      lat: args.lat.toFixed(4),
      lon: args.long.toFixed(4),
      carbonCreditEffectiveness: carbonCreditEffectiveness.toFixed(4),
      protocolFees: protocolFees,
      installFixedFee: DEFAULT_INSTALL_FEE.toFixed(4),
    };
    console.log({ group });
    const { quoteGroupId } = await createQuoteGroup({
      quotes,
      group,
    });

    const firstQuote = farmValueEstimtesAndTimestamps[0];
    const totalBudget =
      firstQuote.estimate + protocolFees + DEFAULT_INSTALL_FEE;
    console.log({ totalBudget, firstQuote });
    const amountsAndQuoteGroupsToSendToFrontend = farmValueEstimtesAndTimestamps
      .map(({ estimate, timestamp }) => ({
        timestamp: timestamp,
        estimate: estimate * (1 - formulaConstants.scoutingFee),
      }))
      .filter(({ estimate }) => estimate > 0);

    // Calculate the minimum electricity price needed for profitability
    // This is a simplified calculation based on the carbon credit effectiveness
    const minimumElectricityPrice =
      carbonCreditEffectiveness * formulaConstants.maximumElectricityPrice;
    const res = {
      estimates: amountsAndQuoteGroupsToSendToFrontend,
      quoteGroupId,
      protocolFees: protocolFees,
      totalBudget,
      currentElectricityPrice: args.electricityPricePerKWH,
      recommendedMaxElectricityPrice: minimumElectricityPrice,
    };
    return Response.json({ ...res });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      {
        status:
          error instanceof Error && error.message.includes("Rate limit")
            ? 429
            : 500,
      }
    );
  }
}
