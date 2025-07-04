# wPapers - Wallpaper Sharing App

A modern, responsive web application for sharing and discovering wallpapers. Built with Node.js, Express, PostgreSQL, and Tailwind CSS.

## Features

- 🖼️ Upload and share wallpapers
- 🔍 Search wallpapers by tags or name
- 📱 Fully responsive design
- 🎨 Minimalist white and green theme
- ⬇️ Download wallpapers directly
- 🏷️ Tag-based organization
- 💾 PostgreSQL database for data persistence

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wpapers
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL**

   First, make sure PostgreSQL is installed and running on your system.

   Create a new database:
   ```sql
   CREATE DATABASE wpapers;
   ```

   Update the database connection in `server.js`:
   ```javascript
   const pool = new Pool({
       user: 'your_username',
       host: 'localhost',
       database: 'wpapers',
       password: 'your_password',
       port: 5432,
   });
   ```

4. **Create the uploads directory**
   The application will automatically create the `public/uploads` directory when it starts.

## Running the Application

1. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

2. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## API Endpoints

- `GET /api/wallpapers` - Get all wallpapers
- `POST /api/wallpapers` - Upload a new wallpaper
- `GET /api/wallpapers/search?q=<query>` - Search wallpapers
- `DELETE /api/wallpapers/:id` - Delete a wallpaper

## File Structure

```
wpapers/
├── index.html          # Main HTML file
├── app.js              # Frontend JavaScript
├── server.js           # Backend server
├── package.json        # Dependencies
├── README.md           # This file
└── public/
    └── uploads/        # Uploaded images (auto-created)
```

## Database Schema

The application uses a single table `wallpapers` with the following structure:

```sql
CREATE TABLE wallpapers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tags TEXT[] NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### Environment Variables

You can set the following environment variables:

- `PORT` - Server port (default: 3000)
- `DB_USER` - PostgreSQL username
- `DB_HOST` - PostgreSQL host
- `DB_NAME` - Database name
- `DB_PASSWORD` - PostgreSQL password
- `DB_PORT` - PostgreSQL port

### File Upload Limits

- Maximum file size: 10MB
- Supported formats: JPEG, JPG, PNG, GIF, WebP

## Development

### Adding New Features

1. Frontend changes: Edit `index.html` and `app.js`
2. Backend changes: Edit `server.js`
3. Database changes: Modify the `initializeDatabase()` function

### Testing

The application includes basic error handling and validation. For production use, consider adding:

- Input sanitization
- Rate limiting
- Authentication
- Image optimization
- CDN integration

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check if PostgreSQL is running
   - Verify database credentials in `server.js`
   - Ensure the database exists

2. **Upload directory not found**
   - The application creates the directory automatically
   - Check file permissions

3. **CORS errors**
   - The application includes CORS middleware
   - Check if the frontend is served from the correct origin

### Logs

Check the console output for detailed error messages and debugging information.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please open an issue on the repository. # wpapers
