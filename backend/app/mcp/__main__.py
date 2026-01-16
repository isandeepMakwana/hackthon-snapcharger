from app.mcp.settings import get_mcp_settings
from app.mcp.server import create_mcp_server


def main() -> None:
    settings = get_mcp_settings()
    mcp = create_mcp_server(settings)
    mcp.run(settings.mcp_transport)


if __name__ == '__main__':
    main()
