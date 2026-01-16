from app.mcp.server import mcp, settings


def main() -> None:
    mcp.run(transport=settings.mcp_transport)


if __name__ == '__main__':
    main()
