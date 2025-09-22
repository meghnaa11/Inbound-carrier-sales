# Inbound Carrier Sales Automation

AI-powered system for automating trucking carrier sales calls using HappyRobot, FastAPI, and Next.js.

## What It Does

- **AI Agent**: Handles inbound carrier calls automatically
- **MC Verification**: Validates carriers using FMCSA API
- **Load Matching**: Finds and presents relevant trucking loads
- **Price Negotiation**: Negotiates rates up to 3 rounds
- **Call Transfer**: Transfers successful deals to sales reps
- **Analytics**: Tracks call outcomes and performance

## Quick Start

### Backend (FastAPI)
```bash
# Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run
uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)
```bash
cd Frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Live API
- **Health**: https://inbound-carrier-sales-one.fly.dev/health
- **Loads**: https://inbound-carrier-sales-one.fly.dev/loads/search

## API Endpoints

### Health Check
```bash
GET /health
```
Returns: `{"ok": true}`

### MC Verification
```bash
GET /mc/verify?mc_number={mc_number}
```
**Parameters:**
- `mc_number` (required): Motor Carrier number (3-20 characters)

**Response:** FMCSA API response with carrier verification data

### Load Management

#### Create Load
```bash
POST /loads
Content-Type: application/json

{
  "load_id": "L-90220",
  "origin": "Chicago, IL",
  "destination": "Denver, CO",
  "pickup_datetime": "2025-01-20T08:00:00-06:00",
  "delivery_datetime": "2025-01-21T18:00:00-07:00",
  "equipment_type": "Dry Van",
  "loadboard_rate": 1500,
  "miles": 950,
  "weight": 35000,
  "commodity_type": "Electronics",
  "num_of_pieces": 20,
  "dimensions": "48x40x96"
}
```

#### Search Loads
```bash
GET /loads/search?origin=Dallas&destination=Atlanta&equipment=Dry%20Van&min_rate=1000&max_rate=2000&limit=10
```
**Parameters:**
- `origin` (optional): Pickup location (case-insensitive substring)
- `destination` (optional): Delivery location (case-insensitive substring)
- `equipment` (optional): Equipment type filter
- `min_rate` (optional): Minimum rate filter
- `max_rate` (optional): Maximum rate filter
- `pickup_earliest` (optional): Earliest pickup time (ISO8601)
- `pickup_latest` (optional): Latest pickup time (ISO8601)
- `origin_radius_miles` (optional): Search radius in miles (default: 100)
- `limit` (optional): Results limit 1-100 (default: 10)

#### Get Specific Load
```bash
GET /loads/{load_id}
```
**Parameters:**
- `load_id` (required): Load identifier

### Call Analytics

#### Log Call Summary
```bash
POST /events/call-summary
Content-Type: application/json

{
  "ts": "2025-01-16T10:30:00Z",
  "mc_number": "123456",
  "legal_name": "ABC Trucking",
  "verified": true,
  "load_id": "L-90217",
  "origin": "Dallas, TX",
  "destination": "Atlanta, GA",
  "pickup_datetime": "2025-01-18T08:00:00-05:00",
  "delivery_datetime": "2025-01-19T17:00:00-04:00",
  "loadboard_rate": 1400,
  "agreed_price": 1850,
  "negotiation_rounds": 2,
  "outcome": "verified_and_transferred",
  "sentiment": "positive"
}
```

#### Get Recent Calls
```bash
GET /events/call-summary/recent?limit=25
```
**Parameters:**
- `limit` (optional): Number of recent calls to return (1-500, default: 25)

#### Get Call Analytics
```bash
GET /analytics/calls?days=7
```
**Parameters:**
- `days` (optional): Number of days to analyze (1-90, default: 7)

**Response:**
```json
{
  "outcome_counts": {
    "verified_and_transferred": 15,
    "verified_declined": 8,
    "unverified_ended": 3
  },
  "sentiment_counts": {
    "positive": 12,
    "neutral": 8,
    "negative": 6
  },
  "by_day": [
    {
      "date": "2025-01-16",
      "verified_and_transferred": 5,
      "verified_declined": 2
    }
  ]
}
```

#### Get Detailed Call Logs
```bash
GET /analytics/calls/log
```
Returns detailed call logs with full metrics breakdown.

### Example Usage
```bash
# Search loads
curl "https://inbound-carrier-sales-one.fly.dev/loads/search?origin=Dallas&equipment=Dry%20Van"

# Verify MC
curl "https://inbound-carrier-sales-one.fly.dev/mc/verify?mc_number=123456"

# Get recent calls
curl "https://inbound-carrier-sales-one.fly.dev/events/call-summary/recent"

# Get analytics
curl "https://inbound-carrier-sales-one.fly.dev/analytics/calls"
```

## HappyRobot Agent

### Workflow
1. **MC Verification** → FMCSA lookup
2. **Load Matching** → Search available loads  
3. **Negotiation** → Up to 3 rounds
4. **Call Transfer** → Transfer to sales rep
5. **Data Extraction** → Log outcomes & sentiment

### Agent URLs
- **FMCSA**: `https://inbound-carrier-sales-one.fly.dev/mc/verify?mc_number={mc_number}`
- **Loads**: `https://inbound-carrier-sales-one.fly.dev/loads/search?origin={origin}&equipment={equipment}`

## Database

**Loads**: `load_id`, `origin`, `destination`, `equipment_type`, `loadboard_rate`, `miles`, `weight`, `num_of_pieces`, `dimensions`

**Call Events**: `ts`, `mc_number`, `verified`, `load_id`, `outcome`, `sentiment`, `negotiation_rounds`, `agreed_price`

## Docker

```bash
# Build and run
docker build -t inbound-carrier-sales:local .
docker run --rm -p 8000:8000 -v fastapi_data:/data inbound-carrier-sales:local
```

## Fly.io Deployment

```bash
# Install Fly CLI
iwr https://fly.io/install.ps1 -useb | iex  # Windows
curl -L https://fly.io/install.sh | sh      # macOS/Linux

# Deploy
flyctl auth login
flyctl deploy
```

**Live API**: https://inbound-carrier-sales-one.fly.dev/

## Analytics

- **Call Outcomes**: Track success rates and outcomes
- **Sentiment Analysis**: Monitor carrier satisfaction  
- **Negotiation Metrics**: Average rounds and conversion rates

**API Endpoints**:
- `GET /events/call-summary/recent`: Recent calls
- `GET /analytics/calls`: Aggregated metrics

## Sample Data

Pre-loaded loads for testing:
- **L-90217**: Dallas, TX → Atlanta, GA (Dry Van, $1400)
- **L-90218**: Memphis, TN → Chicago, IL (Reefer, $1200)  
- **L-90219**: Houston, TX → Phoenix, AZ (Flatbed, $1900)

## Challenge Complete

✅ **AI Agent**: HappyRobot workflow  
✅ **MC Verification**: FMCSA integration  
✅ **Load Matching**: Search & filter  
✅ **Negotiation**: 3-round automation  
✅ **Call Transfer**: Sales rep handoff  
✅ **Analytics**: Dashboard & reporting  
✅ **Deployment**: Docker + Fly.io  
✅ **Security**: HTTPS + validation  

**Live Demo**: https://inbound-carrier-sales-one.fly.dev/
