#!/bin/bash

# Docker management scripts for Ado-Dad Backend
# Usage: ./docker-scripts.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
}

# Production commands
start_production() {
    print_header "Starting Production Environment"
    check_docker
    check_docker_compose
    
    print_status "Building and starting production services..."
    docker-compose up -d --build
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    print_status "Checking service status..."
    docker-compose ps
    
    print_status "Production environment is ready!"
    print_status "API: http://localhost:5000"
    print_status "Swagger Docs: http://localhost:5000/docs"
}

stop_production() {
    print_header "Stopping Production Environment"
    docker-compose down
    print_status "Production environment stopped."
}

restart_production() {
    print_header "Restarting Production Environment"
    docker-compose down
    docker-compose up -d --build
    print_status "Production environment restarted."
}

# Development commands
start_development() {
    print_header "Starting Development Environment"
    check_docker
    check_docker_compose
    
    print_status "Building and starting development services..."
    docker-compose -f docker-compose.dev.yml up -d --build
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    print_status "Checking service status..."
    docker-compose -f docker-compose.dev.yml ps
    
    print_status "Development environment is ready!"
    print_status "API: http://localhost:5000"
    print_status "Swagger Docs: http://localhost:5000/docs"
    print_status "MongoDB Express: http://localhost:8081 (admin/password123)"
}

stop_development() {
    print_header "Stopping Development Environment"
    docker-compose -f docker-compose.dev.yml down
    print_status "Development environment stopped."
}

restart_development() {
    print_header "Restarting Development Environment"
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml up -d --build
    print_status "Development environment restarted."
}

# Database commands
backup_database() {
    print_header "Backing Up Database"
    check_docker
    
    BACKUP_DIR="./backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    print_status "Creating database backup..."
    docker-compose exec mongodb mongodump --db adodad_db --out /backup
    
    print_status "Copying backup to host..."
    docker cp adodad_mongodb:/backup "$BACKUP_DIR"
    
    print_status "Backup completed: $BACKUP_DIR"
}

restore_database() {
    print_header "Restoring Database"
    check_docker
    
    if [ -z "$1" ]; then
        print_error "Please provide backup directory path"
        print_status "Usage: $0 restore-db <backup_directory>"
        exit 1
    fi
    
    BACKUP_DIR="$1"
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory does not exist: $BACKUP_DIR"
        exit 1
    fi
    
    print_warning "This will overwrite the current database. Are you sure? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_status "Database restore cancelled."
        exit 0
    fi
    
    print_status "Copying backup to container..."
    docker cp "$BACKUP_DIR" adodad_mongodb:/backup
    
    print_status "Restoring database..."
    docker-compose exec mongodb mongorestore --db adodad_db /backup/adodad_db
    
    print_status "Database restore completed."
}

# Seed data commands
seed_data() {
    print_header "Seeding Database"
    check_docker
    
    print_status "Seeding manufacturers..."
    docker-compose exec app npm run seed:manufacturers
    
    print_status "Seeding vehicle models..."
    docker-compose exec app npm run seed:vehicle-models
    
    print_status "Seeding vehicle variants..."
    docker-compose exec app npm run seed:vehicle-variants
    
    print_status "Seeding ads..."
    docker-compose exec app npm run seed:ads
    
    print_status "Database seeding completed."
}

# Log commands
show_logs() {
    print_header "Showing Application Logs"
    docker-compose logs -f app
}

show_db_logs() {
    print_header "Showing Database Logs"
    docker-compose logs -f mongodb
}

show_all_logs() {
    print_header "Showing All Logs"
    docker-compose logs -f
}

# Cleanup commands
cleanup() {
    print_header "Cleaning Up Docker Resources"
    
    print_warning "This will remove all containers, networks, and volumes. Are you sure? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_status "Cleanup cancelled."
        exit 0
    fi
    
    print_status "Stopping all containers..."
    docker-compose down -v
    
    print_status "Removing unused Docker resources..."
    docker system prune -f
    
    print_status "Cleanup completed."
}

# Status commands
status() {
    print_header "Service Status"
    docker-compose ps
}

status_dev() {
    print_header "Development Service Status"
    docker-compose -f docker-compose.dev.yml ps
}

# Help function
show_help() {
    print_header "Docker Management Scripts"
    echo "Usage: $0 [command]"
    echo ""
    echo "Production Commands:"
    echo "  start-prod     Start production environment"
    echo "  stop-prod      Stop production environment"
    echo "  restart-prod   Restart production environment"
    echo ""
    echo "Development Commands:"
    echo "  start-dev      Start development environment"
    echo "  stop-dev       Stop development environment"
    echo "  restart-dev    Restart development environment"
    echo ""
    echo "Database Commands:"
    echo "  backup-db      Backup database"
    echo "  restore-db     Restore database (requires backup directory)"
    echo "  seed-data      Seed database with sample data"
    echo ""
    echo "Log Commands:"
    echo "  logs           Show application logs"
    echo "  db-logs        Show database logs"
    echo "  all-logs       Show all logs"
    echo ""
    echo "Utility Commands:"
    echo "  status         Show production service status"
    echo "  status-dev     Show development service status"
    echo "  cleanup        Clean up all Docker resources"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start-prod"
    echo "  $0 start-dev"
    echo "  $0 backup-db"
    echo "  $0 restore-db ./backup/20231201_120000"
}

# Main script logic
case "${1:-help}" in
    start-prod)
        start_production
        ;;
    stop-prod)
        stop_production
        ;;
    restart-prod)
        restart_production
        ;;
    start-dev)
        start_development
        ;;
    stop-dev)
        stop_development
        ;;
    restart-dev)
        restart_development
        ;;
    backup-db)
        backup_database
        ;;
    restore-db)
        restore_database "$2"
        ;;
    seed-data)
        seed_data
        ;;
    logs)
        show_logs
        ;;
    db-logs)
        show_db_logs
        ;;
    all-logs)
        show_all_logs
        ;;
    status)
        status
        ;;
    status-dev)
        status_dev
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 