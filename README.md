# Hosting Guide

1. Fork this repository to your GitHub account  
   <img src="assets/fork.png"/>
2. Create A Vercel Account [here](https://vercel.com/signup)
3. Choose the lowest tier plan that is **not free** (required for data storage)
4. Connect your GitHub account to Vercel
5. Create a new project on the Vercel dashboard  
   <img src="assets/add-new-project.png"/>
6. Import Repository, Set Environment Variables, and Launch Project  
   <img src="assets/import-repo.png"/>  
   <img src="assets/deploy.png"/>
   - Click `Add Environment Variables`
   - Required variables:
     - `ADMIN_PASSWORD`: password for admin panel access
     - `NEXT_PUBLIC_LOGO_URL`: the site logo image URL
     - `SCOUTING_FEE`: fee multiplier (e.g., `0.2` = 20%)
7. Go back to your dashboard and click the project you just created
8. Go to the `Storage` tab  
   _Note: The first deploy should fail because storage hasn’t been setup yet_  
   <img src="assets/storage.png"/>
9. Add Postgres
   - Accept all prompts  
     <img src="assets/create-pg.png"/>
10. Go into `Deployments`  
    <img src="assets/deployments.png"/>
11. Hit `Redeploy` on the latest deployment to register the new storage  
    <img src="assets/redeploy.png"/>
12. Wait for the build to finish, go back to the dashboard, and find your deployment URL  
    <img src="assets/find-domain.png"/>

---

## Compute API Endpoint

This project includes a `/api/compute` endpoint that performs estimation logic based on inputs related to power generation and electricity pricing.

### Endpoint

```
GET /api/compute
```

### Required Query Parameters

- `powerOutput` – Estimated yearly power output in kWh (e.g. `40000`)
- `electricityPrice` – Local electricity price per kWh (e.g. `0.08`)
- `lat` – Latitude of the location (e.g. `40.7128`)
- `long` – Longitude of the location (e.g. `-74.0060`)

### Response Format

```json
{
  "estimates": [
    {
      "timestamp": 1234567890,
      "estimate": 12345
    },
    ...
  ],
  "quoteGroupId": "abc123",
  "protocolFees": 1500,
  "totalBudget": 20000,
  "currentElectricityPrice": 0.08,
  "recommendedMaxElectricityPrice": 0.09215
}
```

### What It Does

- Estimates farm value over time, decreasing based on a decay rate and carbon credit effectiveness.
- Calculates protocol fees using predefined interest rates and multipliers.
- Returns an array of values used to display predictions on the frontend.

Make sure your `.env` contains a valid `SCOUTING_FEE` and that the external `elysiaClient` is properly set up for API calls to succeed.
