def pytest_collection_modifyitems(items):
    for item in items:
        for marker in item.iter_markers("scn"):
            for code in marker.args:
                item.user_properties.append(("scn", code))
