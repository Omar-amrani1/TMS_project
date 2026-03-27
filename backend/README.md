# Logistics Management Platform

A comprehensive production and logistics management platform with multi-level stock management, order-driven workflows, and kilometer-based transport costing.

## Features

- **Multi-level Stock Management**: Raw materials, production stock, and finished products
- **Order-driven Workflows**: Complete order lifecycle management
- **Transport Management**: Multiple providers, vehicle allocation, kilometer-based costing
- **Production Tracking**: Raw material consumption and finished product creation
- **Role-based Access Control**: Different roles for managers, stock managers, production clients, and distributors
- **Payment Processing**: Integrated payment tracking for orders and transport

## Technology Stack

- **Backend**: TypeScript, Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Mysql (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Run Prisma migrations:

   ```bash
   npm run prisma:migrate
   ```

5. Generate Prisma client:

   ```bash
   npm run prisma:generate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── app.ts                 # Express app configuration
├── server.ts              # Server entry point
├── config/                # Configuration files
├── modules/               # Feature modules
│   ├── auth/             # Authentication
│   ├── locations/        # Location & distance calculation
│   ├── orders/           # Order processing
│   ├── products/         # Product catalog
│   ├── reports/          # Reporting & analytics
│   ├── stock/            # Stock management
│   ├── transport/        # Transport management
│   └── users/            # User management
├── shared/               # Shared utilities
│   ├── middleware/       # Express middleware
│   ├── errors/           # Error handling
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript types
└── prisma/               # Database schema & migrations
```

## API Documentation

The API follows RESTful conventions and is available at `/api/v1`.

### Main Endpoints

- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/products` - List products
- `POST /api/v1/orders/create` - Create order
- `GET /api/v1/stock/:type` - Get stock levels
- `POST /api/v1/production/batches` - Create production batch
- `GET /api/v1/transport/providers` - List transport providers


### Stock Levels

1. **Raw Material Stock** - Managed by stock managers
2. **Production Stock** - Receives raw materials, produces finished goods
3. **Finished Product Stock** - Auto-receives from production, supplies distributors

### Order Flow

1. Order placed by client (production or distributor)
2. Transport provider selected
3. Cost calculated (product + transport)
4. Stock allocated
5. Transport scheduled
7. Delivery completed

### Transport Costing

```
Transport Cost = Σ(vehicle_cost_per_km × distance_km)
```

Vehicle selection based on:

- Total weight
- Vehicle capacity
- Availability
- Cost optimization

## License

MIT
