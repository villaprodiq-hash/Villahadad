#!/bin/bash
# ==============================================
# Villa Hadad - Upload to Synology NAS
# ==============================================
# هذا السكريبت يبني التطبيق ويرفعه تلقائياً للـ NAS
# ==============================================

# 🔧 Configuration
NAS_IP="192.168.68.120"
NAS_USER="admin"  # ⚠️ غيّر هذا لحسابك في Synology
NAS_PATH="/volume1/web/update"
NAS_URL="http://$NAS_IP/update"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# App types
APP_TYPES=("manager" "reception" "admin" "production" "printer")

# ==============================================
# Functions
# ==============================================

print_header() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Villa Hadad - Upload to NAS ${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

select_app_type() {
    echo "اختر نوع التطبيق للبناء:"
    echo ""
    for i in "${!APP_TYPES[@]}"; do
        echo "  $((i+1)). ${APP_TYPES[$i]}"
    done
    echo ""
    read -p "أدخل الرقم (1-${#APP_TYPES[@]}): " choice

    if [[ $choice -ge 1 && $choice -le ${#APP_TYPES[@]} ]]; then
        APP_TYPE="${APP_TYPES[$((choice-1))]}"
        print_success "تم اختيار: $APP_TYPE"
    else
        print_error "اختيار غير صحيح!"
        exit 1
    fi
}

check_nas_connection() {
    print_info "جاري التحقق من اتصال NAS..."
    if ping -c 1 -W 2 $NAS_IP &> /dev/null; then
        print_success "NAS متصل ($NAS_IP)"
    else
        print_error "فشل الاتصال بـ NAS!"
        print_warning "تأكد من:"
        echo "  - NAS شغال"
        echo "  - IP صحيح: $NAS_IP"
        echo "  - أنت في نفس الشبكة"
        exit 1
    fi
}

get_version() {
    VERSION=$(node -p "require('./package.json').version")
    print_info "النسخة الحالية: v$VERSION"
}

build_app() {
    print_info "جاري بناء التطبيق..."
    echo ""

    if npm run build:$APP_TYPE; then
        print_success "تم البناء بنجاح!"
    else
        print_error "فشل البناء!"
        exit 1
    fi
}

check_files() {
    print_info "جاري التحقق من الملفات..."

    RELEASE_DIR="release/$APP_TYPE"

    if [ ! -d "$RELEASE_DIR" ]; then
        print_error "مجلد الإصدار غير موجود: $RELEASE_DIR"
        exit 1
    fi

    cd "$RELEASE_DIR"

    # Check for required files
    ZIP_FILE=$(ls *.zip 2>/dev/null | head -n 1)
    YML_FILE=$(ls latest-mac.yml 2>/dev/null)

    if [ -z "$ZIP_FILE" ]; then
        print_error "ملف .zip غير موجود!"
        exit 1
    fi

    if [ -z "$YML_FILE" ]; then
        print_error "ملف latest-mac.yml غير موجود!"
        exit 1
    fi

    print_success "الملفات جاهزة:"
    echo "  - $ZIP_FILE"
    echo "  - $YML_FILE"

    # Check for optional files
    DMG_FILE=$(ls *.dmg 2>/dev/null | head -n 1)
    BLOCKMAP_FILE=$(ls *.blockmap 2>/dev/null | head -n 1)

    if [ -n "$DMG_FILE" ]; then
        echo "  - $DMG_FILE"
    fi

    if [ -n "$BLOCKMAP_FILE" ]; then
        echo "  - $BLOCKMAP_FILE"
    fi
}

upload_files() {
    print_info "جاري رفع الملفات إلى NAS..."
    echo ""

    # Use rsync for better progress and reliability
    if command -v rsync &> /dev/null; then
        print_info "استخدام rsync للرفع..."
        if rsync -avz --progress \
            *.zip *.yml *.dmg *.blockmap \
            "$NAS_USER@$NAS_IP:$NAS_PATH/" 2>/dev/null; then
            print_success "تم رفع الملفات بنجاح!"
        else
            print_warning "فشل rsync، جاري المحاولة باستخدام scp..."
            upload_with_scp
        fi
    else
        upload_with_scp
    fi
}

upload_with_scp() {
    if scp *.zip *.yml *.dmg *.blockmap "$NAS_USER@$NAS_IP:$NAS_PATH/" 2>/dev/null; then
        print_success "تم رفع الملفات بنجاح!"
    else
        print_error "فشل رفع الملفات!"
        print_warning "تحقق من:"
        echo "  - اسم المستخدم صحيح: $NAS_USER"
        echo "  - المجلد موجود: $NAS_PATH"
        echo "  - لديك صلاحية الوصول"
        exit 1
    fi
}

verify_upload() {
    print_info "جاري التحقق من الرفع..."

    # Check if latest-mac.yml is accessible via HTTP
    if curl -f -s "$NAS_URL/latest-mac.yml" > /dev/null; then
        print_success "التحديث متاح على: $NAS_URL"
    else
        print_warning "لا يمكن الوصول للملف عبر HTTP"
        print_info "تحقق من Web Station في Synology"
        print_info "URL: $NAS_URL/latest-mac.yml"
    fi
}

show_summary() {
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}  اكتمل الرفع بنجاح! 🎉${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    print_info "التفاصيل:"
    echo "  نوع التطبيق: $APP_TYPE"
    echo "  النسخة: v$VERSION"
    echo "  NAS: $NAS_IP"
    echo "  Update URL: $NAS_URL"
    echo ""
    print_info "الخطوات القادمة:"
    echo "  1. افتح التطبيق على أي جهاز"
    echo "  2. انتظر 5 ثواني"
    echo "  3. ستظهر notification للتحديث"
    echo ""
    print_warning "ملاحظة: تأكد من أن نسخة التطبيق المثبتة أقل من v$VERSION"
    echo ""
}

# ==============================================
# Main Script
# ==============================================

print_header

# Step 1: Select app type
select_app_type
echo ""

# Step 2: Check NAS connection
check_nas_connection
echo ""

# Step 3: Get version
get_version
echo ""

# Step 4: Confirm before building
read -p "هل تريد المتابعة؟ (y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    print_warning "تم الإلغاء."
    exit 0
fi
echo ""

# Step 5: Build app
build_app
echo ""

# Step 6: Check files
check_files
echo ""

# Step 7: Upload files
upload_files
echo ""

# Step 8: Verify upload
verify_upload

# Step 9: Show summary
show_summary

# Return to project root
cd ../..
