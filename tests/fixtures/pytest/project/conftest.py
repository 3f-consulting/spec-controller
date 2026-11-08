def pytest_collection_modifyitems(items):
    for item in items:
        for marker in item.iter_markers("clm"):
            for code in marker.args:
                item.user_properties.append(("clm", code))
