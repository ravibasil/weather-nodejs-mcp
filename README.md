# Weather MCP Server

A Model Context Protocol (MCP) server that provides real-time weather information using the OpenWeather API.

## Features

- **weather_mcp_lookup**: Fetch real-time weather data for any city.
- Integrated with OpenWeather API.
- Supports metric units.

## Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- An [OpenWeather API Key](https://openweathermap.org/api)

### 2. Installation

```bash
npm install
```

### 3. Configuration

Create a `.env` file in the root directory:

```env
WEATHER_API_KEY=your_api_key_here
```

### 4. Running the Server

To start the server using Stdio transport:

```bash
npm start
```

## Integration with MCP Clients

To use this server with an MCP client (like Claude Desktop), add the following configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/path/to/weather-mcp/server.js"],
      "env": {
        "WEATHER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Tools

### `weather_mcp_lookup`

Fetches real-time weather for a specified city.

**Arguments:**
- `city` (string, required): The name of the city (e.g., "London", "New York").

**Example Output:**
```text
Weather in London

Temperature: 15°C
Feels Like: 14°C
Condition: clear sky
Humidity: 60%
Wind Speed: 3.5 m/s
```

## License

ISC
