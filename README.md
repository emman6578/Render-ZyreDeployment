# Node Js Express with Typescript

A robust RESTful API boilerplate to start up developing this includes Role Based Authentication and OTP system

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Users](#users)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Overview

The **My REST API** is a secure, scalable, and easy-to-use interface that follows RESTful principles, ensuring standardized access to data. It is designed to serve web and mobile applications seamlessly.

## Features

- **RESTful Endpoints:** Utilizes standard HTTP methods (GET, POST, PUT, DELETE).
- **Data Format:** JSON is used for all requests and responses.
- **Authentication:** Implements token-based authentication using JWT.
- **Error Handling:** Provides detailed error messages with proper HTTP status codes.
- **Success Handler:** Provides detailed handler for success responses

## Getting Started

Follow the steps below to set up and run the API locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v12 or later)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- A database (e.g., PostgreSQL, MySQL, or a NoSQL option)

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Add .env in root folder:**

   ```bash
    PORT=3001
    DATABASE_URL=mysql://root:@localhost:3306/nodejsboilerplate (database path)
    JWT_SECRET= (put here your jwt secret)

    //generate an app password for Gmail
    MAIL_ID= (your email here)
    MP= (generated password here)
   ```

4. **Database Set up:**

   ```bash
    npx prisma migrate dev --name init
   ```

5. **Run the Program:**

   ```bash
    npm run build
    npm run dev
   ```

## Configuration

All settings are managed via environment variables. Refer to the sample .env file for a complete list of configurable options.

### Authentication

This API uses JSON Web Tokens (JWT) for authentication and email one time password OTP.

- **Base URL (Register):** http://localhost:3001/api/v1/auth/register
- **Method:** POST
  ```bash
  {
      "fullname":"Name here",
      "email":"yourEmail@gmail.com",
      "password":"yourpassowrd",
      "role":"" //Only accepts (ADMIN,MANAGER,USER)
  }
  ```
- **Base URL (Login):** http://localhost:3001/api/v1/auth/login
- **Method:** POST
  ```bash
  {
      "email":"yourEmail@gmail.com",
      "password":"yourPassword"
  }
  ```
- **Base URL (Authenticate):** http://localhost:3001/api/v1/auth/code
- **Method:** POST
  ```bash
  {
     "email":"youremail@gmail.com",
     "emailToken":"code from email"
  }
  ```

## API Endpoints
