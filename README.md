# SilentParcel - Privacy-Focused Data Sharing Platform

<div align="center">

![SilentParcel Logo](https://res.cloudinary.com/dougt66uq/image/upload/silentparcel_dpxnwc.jpg)

![SilentParcel](https://img.shields.io/badge/Status-Active-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black) ![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)

</div>

A secure, end-to-end encrypted data sharing platform built with Next.js, featuring anonymous file uploads, virus scanning, and ephemeral chat rooms. Files are automatically encrypted before upload and self-destruct after download or expiry.

## 🚀 Features

### Core Features
- **End-to-End Encryption**: Files encrypted client-side using AES-256 before upload
- **Virus Scanning**: Automatic malware detection using ClamAV integration
- **Self-Destructing Files**: Automatic cleanup after download or expiry
- **Password Protection**: Optional password-protected file links
- **Multi-File Support**: Upload entire folders with preserved structure
- **Anonymous Sharing**: No registration required
- **Download Limits**: Configurable download count restrictions
- **Modern UI**: Beautiful, responsive interface with dark/light themes

### Collaborative Features
- **Real-time Chat Rooms**: Anonymous ephemeral chat rooms with auto-deletion
- **Collaborative Coding**: Live collaborative code editing with custom cursors
- **Multi-language Support**: JavaScript, TypeScript, Python, Java, C/C++, HTML/CSS, JSON, Markdown
- **Y.js Integration**: Built on Y.js for reliable real-time collaboration
- **WebRTC Communication**: Peer-to-peer communication for low latency
- **Code Synchronization**: Automatic conflict resolution and synchronization
- **File Download**: Download code files with proper extensions
- **Tabbed Interface**: Switch between code editor and chat seamlessly

### Security Features
- **Zero-Knowledge Architecture**: Server cannot decrypt your files
- **Audit Logging**: Comprehensive activity tracking
- **Rate Limiting**: Protection against abuse
- **IP Tracking**: Security monitoring without compromising privacy

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Appwrite Cloud Storage
- **Encryption**: AES-256 with crypto-js
- **Virus Scanning**: ClamAV integration with appwrite ( inbuilt )
- **Real-time**: Supabase real-time subscriptions for chat
- **Collaborative Coding**: Y.js, y-monaco, y-webrtc, Monaco Editor
- **WebRTC**: Peer-to-peer communication for low-latency collaboration

### Key Components

#### Frontend Structure
```
app/
├── page.tsx              # Landing page with animations
├── files/
│   ├── page.tsx          # File upload interface
│   ├── [id]/page.tsx     # File download/view page
│   └── manage/[id]/      # File management interface
├── api/                  # Backend API routes
└── layout.tsx            # Root layout with theme provider
```

#### Backend API Routes
```
app/api/
├── files/
│   ├── upload/           # File upload with encryption
│   ├── download/[token]/ # Secure file download
│   ├── metadata/[token]/ # File metadata retrieval
│   └── manage/[id]/      # File management operations
├── chat/rooms/create/    # Chat room creation
├── health/               # Health check endpoint
└── verify-hcaptcha/      # CAPTCHA verification
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account
- Appwrite account

### 1. Clone the Repository
```bash
git clone https://github.com/SinghAman21/silentparcel.git
cd silentparcel
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=your_appwrite_endpoint
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id
APPWRITE_API_KEY=your_appwrite_api_key
NEXT_PUBLIC_APPWRITE_BUCKET_KEY=your_bucket_id

# Security Configuration
JWT_SECRET=your_jwt_secret_key  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
ENCRYPTION_KEY=your_encryption_key   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# File Configuration
ALLOWED_FILE_TYPES='jpg,jpeg,png,pdf,zip,txt,docx,mp4,mp3'

# Redis Configuration (optional, for rate limiting)
REDIS_URL=your_redis_url

```

### 4. Database Setup
Run the SQL script to create required tables:

```bash
# Connect to your Supabase database and run:
psql -h your_supabase_host -U postgres -d postgres -f scripts/setup-supabase.sql
```

### 5. Appwrite Setup
1. Create a new project in Appwrite
2. Create a storage bucket named `your-bucket-name`
3. Set appropriate permissions for file upload/download
4. Generate API keys with necessary permissions

### 6. Virus Scanner Setup (Optional)
Install ClamAV for virus scanning:
<!-- Since appwrite provides inbuilt virus scanning, this is optional -->
```bash
# Ubuntu/Debian
sudo apt-get install clamav clamav-daemon

# macOS
brew install clamav

# Windows
# Download from https://www.clamav.net/downloads
```

### 7. Development
```bash
pnpm dev
```

Visit `http://localhost:3000` to see the application.

## 🔧 Key Dependencies Explained

### Core Dependencies
- **`next`**: React framework for production
- **`react` & `react-dom`**: UI library
- **`typescript`**: Type safety
- **`@supabase/supabase-js`**: Database client
- **`appwrite` & `node-appwrite`**: File storage
- **`adm-zip`**: ZIP file manipulation
- **`bcryptjs`**: Password hashing
- **`jsonwebtoken`**: JWT token handling
- **`nanoid`**: Unique ID generation

### UI & Styling
- **`tailwindcss`**: Utility-first CSS framework
- **`@radix-ui/*`**: Accessible UI components
- **`lucide-react`**: Icon library
- **`gsap`**: Advanced animations
- **`motion`**: Framer Motion for animations
- **`next-themes`**: Dark/light theme switching

### Security & Validation
- **`zod`**: Schema validation
- **`@hcaptcha/react-hcaptcha`**: CAPTCHA protection
- **`ioredis`**: Redis client for rate limiting
- **`form-data`**: Form data handling

### Development Tools
- **`eslint`**: Code linting
- **`@types/*`**: TypeScript type definitions

## 🔐 Security Implementation

### File Encryption Flow
1. **Client-side Encryption**: Files encrypted using AES-256 before upload
2. **Key Generation**: Unique encryption key for each file
3. **Secure Storage**: Encrypted files stored in Appwrite
4. **Automatic Cleanup**: Files deleted after expiry or download limit

### Virus Scanning
- Files scanned using ClamAV before storage
- Infected files rejected with detailed logging
- Audit trail maintained for security monitoring

### Access Control
- Download tokens for secure file access
- Edit tokens for file management
- Password protection for sensitive files
- Rate limiting to prevent abuse

## 📊 Database Schema

### Core Tables
- **`zip_file_metadata`**: Main file records with encryption keys
- **`zip_subfile_metadata`**: Individual files within ZIP archives
- **`audit_logs`**: Security and activity logging
- **`files`**: Legacy file storage (deprecated)

### Key Fields
- **`download_token`**: Secure access token
- **`edit_token`**: Management access token
- **`encrypted_key`**: AES encryption key
- **`appwrite_id`**: Storage reference
- **`expiry_date`**: Automatic deletion timestamp

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
Ensure all environment variables are properly configured in your production environment, especially:
- Database connection strings
- API keys and secrets
- File size limits
- Allowed file types

## 🔧 Configuration Options

### File Upload Limits
```env
ALLOWED_FILE_TYPES='jpg,jpeg,png,pdf,zip,txt,docx,mp4,mp3'
```

### Security Settings
```env
JWT_SECRET=your_secure_jwt_secret  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
ENCRYPTION_KEY=your_encryption_key   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

ZIP_ENCRYPTION_PUBLIC_KEY=your_zip_encryption_public_key    openssl genrsa -out private.pem 2048

ZIP_ENCRYPTION_PRIVATE_KEY=your_zip_encryption_private_key    openssl rsa -in private.pem -pubout -out public.pem
```

### Storage Configuration
```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
```

## 📈 Monitoring & Maintenance

### Audit Logging
The system maintains comprehensive audit logs for:
- File uploads/downloads
- Security events (virus detection, failed access)
- User activity tracking
- System performance metrics

### Cleanup Scripts
Automated cleanup scripts remove expired files:
```bash
node scripts/cleanup-expired-files.js
```

### Health Monitoring
Health check endpoint available at `/api/health` for monitoring.

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Steps to Contribute:

1. **Create an Issue**  
   - Before starting any work, check the repository for existing issues.  
   - If your idea or bug fix is not listed, create a new issue to discuss it.

2. **Fork the Repository**  
   - Click on the "Fork" button at the top right of the repository page to create your own copy of the repository.

3. **Create a New Branch**  
   - Clone your forked repository to your local machine:  
     ```bash
     git clone https://github.com/<your-username>/silentparcel.git
     cd silentparcel
     ```
   - Create a new branch using the format `<username>--issue-<issue-no>`:  
     ```bash
     git checkout -b <username>--issue-<issue-no>
     ```
     Example:  
     ```bash
     git checkout -b SinghAman21--issue-01
     ```

4. **Make Your Changes**  
   - Implement the changes you want to contribute in this branch.

5. **Create a Pull Request (PR)**  
   - Push your changes to your forked repository:  
     ```bash
     git push origin <username>--issue-<issue-no> -u
     ```
   - Go to the original repository and click on "New Pull Request."
   - Select your branch and provide a **brief description** of the changes you have made.

### Contribution Guidelines
- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting a PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email singhaman21@proton.me or create an issue in the GitHub repository.

## 🔮 Roadmap

- [ ] Enhanced chat room features
- [ ] API rate limiting improvements
- [ ] Multi-language support

---

**Built with ❤️ for privacy-conscious users worldwide**