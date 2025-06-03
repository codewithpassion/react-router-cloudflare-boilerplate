# Photo Competition Platform PRD

## Product Overview

A modern, responsive photo competition website for the Wildlife Disease Association that enables members to participate in photography contests with voting, administration, and community features.

## Target Audience

- **Primary**: Wildlife Disease Association members and photography enthusiasts
- **Secondary**: General public (view-only access)
- **Administrators**: WDA staff managing competitions

## Platform Requirements

- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Modern UI/UX**: Clean, professional design reflecting WDA brand
- **Performance**: Fast loading times for photo galleries
- **Accessibility**: WCAG 2.1 AA compliance

## User Roles & Permissions

### SuperAdmin
- Full system access
- Create/manage Admin users
- All Admin capabilities

### Admin
- Create and manage competitions
- Manage categories
- Review and moderate photo submissions
- Declare winners
- View reported content
- Manage user submissions limits

### Authenticated User
- Upload photos to competitions
- Vote on photos
- Manage their own submissions
- Report inappropriate content

### Unauthenticated User
- Browse competitions
- View photo galleries
- No voting or submission capabilities

## Core Features

### Competition Management (Admin)

#### Competition Creation
- **Title**: Competition name (required)
- **Description**: Detailed competition information (required)
- **Start Date**: When submissions open
- **End Date**: Last submission deadline
- **Status**: Active/Inactive (only one active at a time)

#### Category Management
- **Default Categories**: "Urban", "Landscape"
- **Custom Categories**: Admins can create additional categories
- **Per-category Settings**: Individual submission limits and rules

#### Photo Limits
- **Per User**: Define maximum photos per email address per category
- **Flexible Limits**: Different limits for different categories

#### Winner Declaration
- **1st Place**: Winner selection per category
- **2nd Place**: Runner-up selection per category
- **3rd Place**: Third place selection per category
- **Results Display**: Public winner announcement

#### Photo Moderation
- **Approve**: Accept photo for competition
- **Disapprove**: Reject with reason
- **Delete**: Remove inappropriate content
- **Reports Queue**: Review user-reported photos

### Photo Submission (User)

#### Required Fields
- **Photo File**: High-quality image upload
- **Title**: Descriptive photo title (required)
- **Description**: 20-500 characters (required)
- **Date/Time**: When photo was taken (required)
- **Location**: Where photo was taken (required)

#### Optional Fields
- **Camera/Lens**: Equipment used
- **Settings**: Camera settings (ISO, aperture, etc.)

#### Submission Rules
- **Validation**: All required fields must be non-empty/non-whitespace
- **Limits**: Respect per-category photo limits
- **File Types**: JPEG, PNG support
- **File Size**: Maximum file size limits

#### Photo Management
- **Edit**: Update photo details and optional fields
- **Delete**: Remove own submissions
- **Preview**: View submission before final upload

### Voting System

#### Voting Mechanics
- **One Vote Per Photo**: Users can vote once per photo
- **Unlimited Voting**: Users can vote for multiple photos
- **Vote Tracking**: System tracks voting history
- **Anonymous Voting**: Votes are not publicly attributed

#### Vote Display
- **Vote Counts**: Public vote tallies
- **Sorting**: Sort by votes, date, category
- **Filtering**: Filter by category, date range

### Content Moderation

#### Reporting System
- **Report Button**: On each photo
- **Report Reasons**: Predefined categories
- **Admin Queue**: Centralized report management
- **Response Tracking**: Follow-up on reports

#### Content Guidelines
- **Appropriate Content**: Wildlife/nature photography focus
- **Quality Standards**: Technical and artistic minimums
- **Rights Management**: Original work only

## Technical Specifications

### Performance Requirements
- **Page Load**: < 3 seconds
- **Image Loading**: Progressive/lazy loading
- **Mobile Performance**: Optimized for 3G networks

### File Management
- **Image Storage**: Cloudflare R2/Images
- **Image Processing**: Automatic resizing/optimization
- **Backup**: Regular photo backup system

### Database Schema (Key Entities)

#### Users
- ID, email, role, created_at, updated_at

#### Competitions
- ID, title, description, start_date, end_date, status, created_at

#### Categories
- ID, name, competition_id, max_photos_per_user

#### Photos
- ID, user_id, category_id, title, description, date_taken, location, camera_info, settings, file_path, status, created_at

#### Votes
- ID, user_id, photo_id, created_at

#### Reports
- ID, user_id, photo_id, reason, status, created_at

#### Winners
- ID, photo_id, place (1st, 2nd, 3rd), category_id

## User Flows

### Admin Competition Setup
1. Login as Admin/SuperAdmin
2. Create new competition with dates and description
3. Set up categories (use defaults or create custom)
4. Define photo limits per category
5. Activate competition
6. Monitor submissions and moderate content
7. Declare winners when competition ends

### User Photo Submission
1. Login/register
2. Browse active competition
3. Select category
4. Upload photo with required details
5. Preview and submit
6. View in competition gallery
7. Edit/delete if needed

### Voting Process
1. Browse competition photos
2. View photos by category
3. Click vote on preferred photos
4. View vote counts and rankings
5. Continue voting across categories

## Success Metrics

### Engagement
- **User Registration**: New account signups
- **Photo Submissions**: Total photos per competition
- **Voting Activity**: Total votes cast
- **Return Visits**: User retention rates

### Quality
- **Moderation**: Report resolution time
- **User Satisfaction**: Feedback scores
- **Technical Performance**: Page load times
- **Error Rates**: System stability metrics

## Future Enhancements

### Phase 2 Features
- **Public Galleries**: Archive of past competitions
- **User Profiles**: Photographer portfolios
- **Social Features**: Comments and photo sharing
- **Advanced Voting**: Weighted voting by expertise level
- **Email Notifications**: Competition updates and results

### Advanced Administration
- **Analytics Dashboard**: Detailed competition metrics
- **Bulk Operations**: Mass photo approval/rejection
- **Custom Workflows**: Advanced moderation processes
- **Integration**: Wildlife database connections

## Technical Implementation Notes

- Built on React Router 7 + Cloudflare stack
- Uses existing better-auth authentication system
- Extends current database schema with competition entities
- Leverages Cloudflare Images for photo optimization
- Responsive design using existing Tailwind/ShadCN components