# ASIS Rhymix PHP Codebase Analysis

## Overview

The Rhymix PHP codebase is a comprehensive content management system built on a modular architecture with 23 core modules, multiple addons, and widgets. The system follows a standard MVC pattern with additional components for multi-language support, permissions, and extendibility.

## 1. Complete Module Inventory

### Core Modules

#### 1.1 Board Module (`modules/board`)
**Purpose**: Forum/Board functionality
**Features**:
- Document creation, edit, delete, view
- Comment system
- Category support
- Voting/Recommendation system
- Trackback functionality
- Notice/Important posts
- Password protection
- Document update history
- Recommendation viewer

**Database Schema**:
- Uses `modules` table with `mid`, `browser_title`, `comment`, `module_category_srl`
- Supports domain integration
- Query patterns: list filtering, pagination, search

**UI Components**:
- Default skin and XE-Dition skin
- Mobile support (m.skins)
- Admin interface for board management
- Category management interface

#### 1.2 Document Module (`modules/document`)
**Purpose**: Document/CMS content management
**Features**:
- Document CRUD operations
- Category management
- Document aliases (URL rewriting)
- Temporary document saving
- Declaration/report system
- Voting (up/down)
- Document trash/restore
- Extra variables (custom fields)
- Document update logging
- Read tracking

**Database Schema**:
- `documents` table with:
  - Core: document_srl, module_srl, category_srl, lang_code
  - Content: title, content, is_notice, title_bold, title_color
  - Metadata: readed_count, voted_count, blamed_count, comment_count
  - User info: user_id, user_name, nick_name, member_srl, email_address, homepage
  - SEO: tags, extra_vars
  - Status: status, comment_status

**UI Components**:
- Print preview functionality
- Temp saved documents list
- Document management interface
- Admin panel for content moderation

#### 1.3 Comment Module (`modules/comment`)
**Purpose**: Comment system for documents and other content
**Features**:
- Nested comment structure (parent_srl)
- Comment CRUD operations
- Secret comments
- Voting system
- Comment notifications
- Comment management

**Database Schema**:
- `comments` table with:
  - Core: comment_srl, module_srl, document_srl, parent_srl
  - Content: content, is_secret
  - Metadata: voted_count, blamed_count, uploaded_count
  - User info: user_id, user_name, nick_name, member_srl
  - Status: status (active/inactive)

**UI Components**:
- Threaded comment display
- Comment write/edit forms
- Admin comment moderation

#### 1.4 Member Module (`modules/member`)
**Purpose**: User management and authentication
**Features**:
- Member registration, login, logout
- Profile management
- Group/Permission management
- Authentication integration
- Member search
- Join/Withdraw management
- Login tracking

**Database Schema**:
- `member` table with:
  - Authentication: user_id, password, email_address
  - Profile: user_name, nick_name, homepage, blog, birthday
  - Contact: phone_number, phone_country, phone_type
  - Account: is_admin, denied, status, regdate, limit_date
  - Preferences: allow_mailing, allow_message
  - Security: find_account_question, find_account_answer

**UI Components**:
- Member registration forms
- Login/Logout interface
- Profile management
- Admin member management
- Mobile support

#### 1.5 File Module (`modules/file`)
**Purpose**: File upload and management
**Features**:
- File upload/download
- File type validation
- File storage management
- Image processing
- File permission management

**Database Schema**:
- `files` table with file metadata
- Support for multiple file types
- File size and type validation

#### 1.6 Editor Module (`modules/editor`)
**Purpose**: WYSIWYG editor integration
**Features**:
- Multiple editor types (default, simple)
- Image upload integration
- File attachment
- Format preservation
- Preview functionality

#### 1.7 Layout Module (`modules/layout`)
**Purpose**: Site layout and template management
**Features**:
- Layout creation and management
- Template system
- Responsive design support
- Mobile layout support

#### 1.8 Page Module (`modules/page`)
**Purpose**: Static page management
**Features**:
- Static page creation
- Page hierarchy
- Page permissions
- Mobile page support

#### 1.9 Menu Module (`modules/menu`)
**Purpose**: Navigation menu management
**Features**:
- Menu creation and management
- Multi-level menus
- Menu permissions
- Mobile menu support

#### 1.10 Communication Module (`modules/communication`)
**Purpose**: Communication features (messaging, notifications)
**Features**:
- Private messaging
- Notifications
- Email integration
- Push notifications

#### 1.11 Message Module (`modules/message`)
**Purpose**: Message and notification system
**Features**:
- Internal messaging
- System notifications
- Message templates

#### 1.12 Ncenterlite Module (`modules/ncenterlite`)
**Purpose**: Notification center
**Features**:
- Unified notification system
- Notification types (messages, comments, etc.)
- Notification settings
- Mobile notifications

#### 1.13 Admin Module (`modules/admin`)
**Purpose**: Administrative backend
**Features**:
- Dashboard
- System configuration
- Module management
- Security settings

#### 1.14 Counter Module (`modules/counter`)
**Purpose**: Site traffic analytics
**Features**:
- Page view counting
- Unique visitor tracking
- Traffic statistics

#### 1.15 Integration Search Module (`modules/integration_search`)
**Purpose**: Search functionality
**Features**:
- Content search
- Search indexing
- Search filters
- Search relevance

#### 1.16 Tag Module (`modules/tag`)
**Purpose**: Tag management system
**Features**:
- Tag creation and management
- Tag cloud
- Related tags

#### 1.17 Poll Module (`modules/poll`)
**Purpose**: Poll/Quiz functionality
**Features**:
- Poll creation
- Vote collection
- Poll results
- Multiple poll types

#### 1.18 RSS Module (`modules/rss`)
**Purpose**: RSS feed generation
**Features**:
- RSS feed creation
- Feed customization
- Multiple feed types

#### 1.19 Point Module (`modules/point`)
**Purpose**: Point/reward system
**Features**:
- Point allocation
- Point exchange
- Point management

#### 1.20 Trash Module (`modules/trash`)
**Purpose**: Content trash system
**Features**:
- Soft delete
- Restore functionality
- Permanent delete

#### 1.21 Spamfilter Module (`modules/spamfilter`)
**Purpose**: Anti-spam system
**Features**:
- Spam detection
- IP filtering
- CAPTCHA integration

#### 1.22 Addon Module (`modules/addon`)
**Purpose**: Addon management
**Features**:
- Addon installation
- Addon configuration
- Addon management

#### 1.23 Widget Module (`modules/widget`)
**Purpose**: Widget system
**Features**:
- Widget creation
- Widget management
- Widget placement

### Addons

#### 1.24 Admin Logging (`addons/adminlogging`)
- Admin action logging
- Security audit trail

#### 1.25 Autolink (`addons/autolink`)
- Automatic link generation
- Keyword linking

#### 1.26 Counter (`addons/counter`)
- Enhanced traffic statistics
- Detailed analytics

#### 1.27 Member Extra Info (`addons/member_extra_info`)
- Extended member fields
- Custom member attributes

#### 1.28 Photoswipe (`addons/photoswipe`)
- Image gallery enhancement
- Touch-enabled image viewer

#### 1.29 Point Level Icon (`addons/point_level_icon`)
- Point-based icons
- Achievement system

### Widgets

#### 2.1 Content Widget (`widgets/content`)
- Content display widget
- Customizable content rendering

#### 2.2 Counter Status Widget (`widgets/counter_status`)
- Traffic display
- Statistics widget

#### 2.3 Language Select Widget (`widgets/language_select`)
- Language switcher
- Multi-language support

#### 2.4 Login Info Widget (`widgets/login_info`)
- User login status
- Authentication interface

#### 2.5 Mcontent Widget (`widgets/mcontent`)
- Mobile content display
- Responsive content widget

#### 2.6 Poll Widget (`widgets/pollWidget`)
- Poll display widget
- Interactive polls

## 2. Common Patterns and Architecture

### 2.1 Module Structure
Standard module structure:
```
module_name/
├── conf/module.xml          # Module configuration and actions
├── admin.*.php             # Admin interface files
├── *.controller.php        # Business logic
├── *.model.php             # Data access layer
├── *.view.php              # View layer
├── *.class.php            # Core class definition
├── queries/*.xml          # Database queries
├── schemas/*.xml          # Database schema
├── ruleset/*.xml          # Validation rules
├── skins/                 # Desktop themes
├── m.skins/               # Mobile themes
├── lang/                  # Language files
└── tpl/                   # Templates
```

### 2.2 MVC Pattern Implementation
- **Model**: `*.model.php` - Database operations and data retrieval
- **View**: `*.view.php` - Presentation logic and template rendering
- **Controller**: `*.controller.php` - Business logic and workflow

### 2.3 Permission System
- Role-based access control (guest, member, manager, admin)
- Module-specific permissions defined in `conf/module.xml`
- Granular control over actions (view, write, delete, etc.)

### 2.4 Multi-Language Support
- Built-in internationalization
- Language files in `lang/` directory
- Language code support (ko, en, zh, jp, etc.)
- Admin interface for language management

### 2.5 Database Patterns
- XML-based query definitions (`queries/*.xml`)
- Schema definitions (`schemas/*.xml`)
- Table naming convention: `[module_name]_*`
- Common fields: `module_srl`, `member_srl`, `regdate`, `last_update`

### 2.6 Caching Mechanism
- File-based caching
- Module-level cache management
- Template caching

### 2.7 File Upload/Management
- Secure file handling
- Type and size validation
- Multiple storage options
- Image processing capabilities

### 2.8 SEO Features
- SEO-friendly URLs
- Meta tag management
- Sitemap generation
- Title customization

## 3. Integration Points

### 3.1 Module Dependencies
- Board ↔ Comment: Comments attached to board posts
- Document ↔ Comment: Comments attached to documents
- Member ↔ All modules: User authentication and profiles
- File ↔ All modules: File attachment support

### 3.2 Event System
- Event handlers defined in `conf/module.xml`
- Common events: member menu, sitemap, module copy
- Observer pattern for extensibility

### 3.3 Widget Integration
- Widgets can be placed in layouts
- Dynamic widget loading
- Widget permission management

### 3.4 Addon System
- Hook-based architecture
- Event-driven extensions
- Pluggable functionality

## 4. Security Features

### 4.1 Authentication
- Session management
- Password hashing
- Login attempt tracking
- IP-based security

### 4.2 Authorization
- Role-based permissions
- Module-level access control
- Action-level restrictions
- Fine-grained grants

### 4.3 Input Validation
- XML-based validation rules
- XSS protection
- SQL injection prevention
- CSRF protection

### 4.4 Anti-Spam
- CAPTCHA integration
- IP filtering
- Content moderation
- Spam detection algorithms

## 5. Performance Optimizations

### 5.1 Caching Strategy
- Database query caching
- Template caching
- Page caching
- Object caching

### 5.2 Database Optimization
- Indexing strategy
- Query optimization
- Connection pooling
- Write-heavy operations

### 5.3 Frontend Performance
- Minified CSS/JS
- Image optimization
- Lazy loading
- CDN support

## 6. Mobile Support

### 6.1 Mobile Detection
- User-Agent parsing
- Device-specific layouts
- Responsive design

### 6.2 Mobile Modules
- Separate mobile skins (`m.skins/`)
- Mobile-specific controllers
- Touch interface support
- Performance optimization

## 7. Common UI Components

### 7.1 Form Elements
- Standardized form templates
- Validation integration
- File upload components
- Rich text editors

### 7.2 Display Components
- List views with pagination
- Detail views
- Grid layouts
- Search interfaces

### 7.3 Admin Interface
- Dashboard widgets
- Configuration forms
- Data management tables
- Action buttons

## 8. Architecture Strengths

### 8.1 Modular Design
- High cohesion within modules
- Low coupling between modules
- Easy extension and customization
- Clear separation of concerns

### 8.2 Scalability
- Horizontal scaling support
- Load balancing ready
- Database optimization
- Caching at multiple levels

### 8.3 Maintainability
- Consistent code structure
- XML configuration
- Clear naming conventions
- Well-documented APIs

### 8.4 Extensibility
- Plugin architecture
- Hook system
- Theme system
- Widget system

## 9. Key Architectural Patterns

### 9.1 Module Lifecycle
1. **Installation**: Module registration and database setup
2. **Activation**: Module enable and configuration
3. **Execution**: Request processing and response generation
4. **Deactivation**: Module cleanup
5. **Uninstallation**: Module removal

### 9.2 Request Flow
1. **Routing**: URL parsing and action mapping
2. **Authentication**: User verification
3. **Authorization**: Permission checking
4. **Controller**: Business logic execution
5. **Model**: Data operations
6. **View**: Response rendering
7. **Output**: Final response delivery

### 9.3 Configuration Management
- Centralized configuration via `conf/module.xml`
- Runtime configuration loading
- Override capabilities
- Environment-specific settings

### 9.4 Error Handling
- Centralized error management
- Graceful degradation
- Logging and debugging support
- User-friendly error messages

## 10. Migration Considerations

### 10.1 Database Migration
- Schema differences (MySQL vs PostgreSQL)
- Query syntax adjustments
- Index optimization
- Data type mapping

### 10.2 Code Migration
- PHP to TypeScript conversion
- Framework adaptation (Next.js)
- Component architecture
- State management

### 10.3 Feature Parity
- Core functionality preservation
- UI/UX consistency
- Performance optimization
- Mobile responsiveness

### 10.4 Modernization Opportunities
- API-first architecture
- Microservices potential
- Cloud-native deployment
- Progressive Web App features

This analysis provides a comprehensive understanding of the Rhymix PHP codebase architecture, module capabilities, and design patterns. The system demonstrates a mature, feature-rich CMS with strong modularity, security features, and extensibility.

## 9. Screen Design Analysis

### 9.1 Skin Structure Analysis

#### 9.1.1 Standard Module Skin Structure
All modules follow a consistent skin structure:
```
modules/[module]/skins/[skin_name]/
├── skin.xml              # Skin configuration and metadata
├── _header.html          # Common header template
├── _footer.html          # Common footer template
├── [module].css          # Module-specific styles
├── [module].js           # Module-specific JavaScript
├── list.html             # List view template
├── [module].list.html   # Extended list template
├── _list.html            # Common list elements
├── read.html             # Read/view template
├── _read.html            # Common read elements
├── write_form.html       # Write/edit form
├── comment_form.html     # Comment form
├── delete_form.html      # Delete confirmation
├── [action].html         # Other action templates
└── [action]_form.html    # Form templates
```

#### 9.1.2 Mobile Skin Structure
Mobile skins are separated into `m.skins/` directory:
```
modules/[module]/m.skins/[skin_name]/
├── Same structure as desktop skins
├── Mobile-specific templates
├── Touch-optimized interfaces
└── Responsive design patterns
```

#### 9.1.3 Skin Configuration (skin.xml)
Each skin includes:
```xml
<skin version="0.2">
    <title xml:lang="ko">스킨 제목</title>
    <description xml:lang="ko">스킨 설명</description>
    <version>1.0</version>
    <author>NAVER</author>
    <extra_vars>
        <var name="config_name" type="text">
            <title xml:lang="ko">설정 제목</title>
        </var>
    </extra_vars>
</skin>
```

### 9.2 Screen-by-UI Components

#### 9.2.1 Board Module Screens

**List Page (list.html)**
- Structure: Header + Document List + Pagination
- Components:
  ```html
  <include target="_header.html" />
  <table width="100%" border="1">
      <thead>
          <tr>
              <th scope="col">No</th>
              <th scope="col">Title</th>
              <th scope="col">Author</th>
              <th scope="col">Date</th>
              <th scope="col">Views</th>
              <th scope="col">Replies</th>
              <th scope="col">Recommend</th>
          </tr>
      </thead>
      <tbody>
          <tr loop="$document_list=>$no,$document">
              <td>{$no}</td>
              <td><a href="{$document->getUrl()}">{$document->getTitle()}</a></td>
              <td>{$document->getNickName()}</td>
              <td>{$document->getRegdate('Y.m.d')}</td>
              <td>{$document->get('readed_count')}</td>
              <td>{$document->getCommentCount()}</td>
              <td>{$document->get('voted_count')}</td>
          </tr>
      </tbody>
  </table>
  <Pagination Components>
  ```

**Read Page (_read.html)**
- Structure: Header + Document Content + Footer
- Components:
  ```html
  <div class="board_read">
      <div class="read_header">
          <h1>{$oDocument->getTitle()}</h1>
          <p class="time">{$oDocument->getRegdate('Y.m.d H:i')}</p>
          <p class="meta">
              <span class="author">{$oDocument->getNickName()}</span>
              <span class="read">Views: {$oDocument->get('readed_count')}</span>
              <span class="vote">Votes: {$oDocument->get('voted_count')}</span>
          </p>
      </div>
      <div class="read_body">
          {$oDocument->getContent(false)}
      </div>
      <div class="read_footer">
          <!-- Extra fields, files, comments -->
      </div>
  </div>
  ```

**Write Form (write_form.html)**
- Structure: Header + Form + Editor + Options
- Components:
  ```html
  <form action="./" method="post" onsubmit="return procFilter(this, window.insert)">
      <div class="write_header">
          <select name="category_srl">
              <option value="">Category</option>
          </select>
          <input type="text" name="title" class="iText" />
          <select name="is_notice" cond="$grant->manager">
              <option value="N">Normal</option>
              <option value="Y">Notice</option>
          </select>
      </div>
      <div class="write_editor">
          {$oDocument->getEditor()}
      </div>
      <div class="write_footer">
          <input type="checkbox" name="notify_message" />
          <label>Notify me of replies</label>
      </div>
  </form>
  ```

#### 9.2.2 Member Module Screens

**Registration Form (signup_form.html)**
- Structure: Multi-step registration form
- Components:
  - User ID input
  - Password fields
  - Name/Nickname
  - Email address
  - Phone number
  - Birthdate
  - Optional fields (homepage, blog)

**Login Form (login_form.html)**
- Structure: Simple authentication form
- Components:
  - User ID input
  - Password input
  - Auto-login checkbox
  - Find account links

**Profile Management (modify_info.html)**
- Structure: Profile editing form
- Components:
  - Basic info update
  - Password change
  - Profile image
  - Contact information
  - Preferences

#### 9.2.3 Document Module Screens
- Similar structure to board but without reply/interactive features
- Focus on content display and management
- Print preview functionality
- Document management interface

### 9.3 Layout Structure

#### 9.3.1 Layout System
Layouts are managed by the layout module and support:
- Faceoff layout system
- Widget placement zones
- Mobile-responsive layouts
- Multiple column options

#### 9.3.2 Faceoff Layout Structure
```html
<div id="xe" class="{$layout_info->faceoff_ini_config['type']} {$layout_info->faceoff_ini_config['align']}">
    <div id="container" class="{$layout_info->faceoff_ini_config['column']}">
        <div id="header">
            <h1><a href="{$layout_info->index_url}">Logo/Title</a></h1>
        </div>
        <div id="neck">
            <!-- Top navigation, banners -->
        </div>
        <div id="body">
            <div id="content">
                {$content|noescape}
            </div>
            <div class="extension e1">
                <!-- Widget zone 1 -->
            </div>
            <div class="extension e2">
                <!-- Widget zone 2 -->
            </div>
        </div>
        <div id="knee">
            <!-- Bottom widgets -->
        </div>
        <div id="footer">
            <address>Copyright information</address>
        </div>
    </div>
</div>
```

#### 9.3.3 Widget Structure
Widgets follow a consistent structure:
```
widgets/[widget_name]/skins/[skin_name]/
├── skin.xml           # Widget configuration
├── content.html        # Main widget template
├── [style].html       # Style variations
├── css/widget.css     # Widget styles
├── js/widget.js       # Widget JavaScript
└── filter/            # Filter templates
```

**Content Widget Example**
```html
<div class="widgetContainer">
    <!--@if($widget_info->tab_type == "tab_left")-->
        <!--#include("./_tab_left.html")-->
    <!--@elseif($widget_info->tab_type == "tab_top")-->
        <!--#include("./_tab_top.html")-->
    <!--@else-->
        <!--#include("./_tab_none.html")-->
    <!--@end-->
</div>
```

### 9.4 Common UI Patterns

#### 9.4.1 Form Patterns
- Consistent form structure: header + fields + footer
- Validation integration using iCheck class
- Required field indicators with `<em>*</em>`
- File upload components with preview

#### 9.4.2 List Patterns
- Table-based layouts with sorting
- Pagination with consistent navigation
- Search integration
- Bulk actions with checkboxes
- Notice/important item highlighting

#### 9.4.3 Display Patterns
- Content display with formatting preservation
- File attachment lists
- Image galleries
- Comment threads
- Tag clouds
- Related content

### 9.5 CSS/JavaScript Structure

#### 9.5.1 CSS Organization
- Module-specific CSS files
- Skin-specific variations
- Responsive design patterns
- Mobile-specific styles
- Icon and image assets

#### 9.5.2 JavaScript Patterns
- Module-specific JavaScript files
- Form handling and validation
- AJAX interactions
- Dynamic content loading
- Event handling

#### 9.5.3 Template Language Features
- `{@if condition}`: Conditional statements
- `{@foreach loop}`: Loop iteration
- `{@end}`: Block termination
- `{@include target}`: Template inclusion
- `{@load target}`: Asset loading
- `{@noescape}`: Output escaping control

### 9.6 Mobile Design

#### 9.6.1 Mobile Detection
- User-Agent parsing
- Device-specific layouts
- Responsive design patterns

#### 9.6.2 Mobile-Specific Features
- Touch-optimized interfaces
- Simplified navigation
- Mobile-specific templates
- Performance optimization

### 9.7 Admin Interface

#### 9.7.1 Admin Layout
- Dashboard widgets
- Configuration forms
- Data management tables
- Action buttons
- Search and filters

#### 9.7.2 Admin Patterns
- Consistent header/navigation
- Form validation
- Batch operations
- Status indicators
- Progress indicators

This screen design analysis provides a comprehensive view of the Rhymix UI architecture, template patterns, and design conventions. The system demonstrates a well-structured approach to web development with clear separation of concerns and consistent user experience across modules.