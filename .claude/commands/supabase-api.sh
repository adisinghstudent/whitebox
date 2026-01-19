#!/bin/bash
# Supabase Management API - Fully CLI-driven project management
#
# SETUP (one-time):
# 1. Go to https://supabase.com/dashboard/account/tokens
# 2. Create a new access token
# 3. Add to your shell: export SUPABASE_ACCESS_TOKEN="sbp_xxxxx"
#
# USAGE:
#   ./supabase-api.sh create <project-name> <org-id> <region> <db-password>
#   ./supabase-api.sh list
#   ./supabase-api.sh keys <project-ref>
#   ./supabase-api.sh delete <project-ref>

set -e

API_URL="https://api.supabase.com/v1"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "Error: SUPABASE_ACCESS_TOKEN not set"
    echo "Get one from: https://supabase.com/dashboard/account/tokens"
    exit 1
fi

auth_header="Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

case "$1" in
    list)
        echo "Listing projects..."
        curl -s -H "$auth_header" "$API_URL/projects" | jq '.[] | {id, name, region, status}'
        ;;

    orgs)
        echo "Listing organizations..."
        curl -s -H "$auth_header" "$API_URL/organizations" | jq '.[] | {id, name}'
        ;;

    regions)
        echo "Available regions:"
        echo "  us-east-1       - East US (North Virginia)"
        echo "  us-west-1       - West US (North California)"
        echo "  us-west-2       - West US (Oregon)"
        echo "  eu-west-1       - West EU (Ireland)"
        echo "  eu-west-2       - West EU (London)"
        echo "  eu-central-1    - Central EU (Frankfurt)"
        echo "  ap-southeast-1  - Southeast Asia (Singapore)"
        echo "  ap-northeast-1  - Northeast Asia (Tokyo)"
        echo "  ap-south-1      - South Asia (Mumbai)"
        echo "  sa-east-1       - South America (São Paulo)"
        ;;

    create)
        if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ] || [ -z "$5" ]; then
            echo "Usage: $0 create <name> <org-id> <region> <db-password>"
            echo "Run '$0 orgs' to get org-id"
            echo "Run '$0 regions' to see available regions"
            exit 1
        fi

        NAME="$2"
        ORG_ID="$3"
        REGION="$4"
        DB_PASS="$5"

        echo "Creating project: $NAME in $REGION..."

        RESPONSE=$(curl -s -X POST "$API_URL/projects" \
            -H "$auth_header" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"$NAME\",
                \"organization_id\": \"$ORG_ID\",
                \"region\": \"$REGION\",
                \"db_pass\": \"$DB_PASS\",
                \"plan\": \"free\"
            }")

        echo "$RESPONSE" | jq '.'

        PROJECT_REF=$(echo "$RESPONSE" | jq -r '.id')
        if [ "$PROJECT_REF" != "null" ]; then
            echo ""
            echo "Project created successfully!"
            echo "Project Reference: $PROJECT_REF"
            echo "URL: https://$PROJECT_REF.supabase.co"
            echo ""
            echo "Next steps:"
            echo "  1. Wait ~2 minutes for project to be ready"
            echo "  2. Run: $0 keys $PROJECT_REF"
            echo "  3. Run: supabase link --project-ref $PROJECT_REF"
        fi
        ;;

    keys)
        if [ -z "$2" ]; then
            echo "Usage: $0 keys <project-ref>"
            exit 1
        fi

        PROJECT_REF="$2"
        echo "Fetching API keys for $PROJECT_REF..."

        KEYS=$(curl -s -H "$auth_header" "$API_URL/projects/$PROJECT_REF/api-keys")

        echo "$KEYS" | jq '.'

        ANON_KEY=$(echo "$KEYS" | jq -r '.[] | select(.name == "anon") | .api_key')
        SERVICE_KEY=$(echo "$KEYS" | jq -r '.[] | select(.name == "service_role") | .api_key')

        echo ""
        echo "=== Environment Variables ==="
        echo "NEXT_PUBLIC_SUPABASE_URL=https://$PROJECT_REF.supabase.co"
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
        echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY"
        ;;

    status)
        if [ -z "$2" ]; then
            echo "Usage: $0 status <project-ref>"
            exit 1
        fi

        curl -s -H "$auth_header" "$API_URL/projects/$2" | jq '{id, name, status, region}'
        ;;

    delete)
        if [ -z "$2" ]; then
            echo "Usage: $0 delete <project-ref>"
            exit 1
        fi

        echo "Deleting project $2..."
        curl -s -X DELETE -H "$auth_header" "$API_URL/projects/$2"
        echo "Project deleted"
        ;;

    *)
        echo "Supabase Management API CLI"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  list              List all projects"
        echo "  orgs              List organizations"
        echo "  regions           Show available regions"
        echo "  create            Create a new project"
        echo "  keys <ref>        Get API keys for a project"
        echo "  status <ref>      Check project status"
        echo "  delete <ref>      Delete a project"
        echo ""
        echo "Setup:"
        echo "  export SUPABASE_ACCESS_TOKEN='sbp_xxxxx'"
        echo "  Get token from: https://supabase.com/dashboard/account/tokens"
        ;;
esac
