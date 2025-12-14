import json


def test_build_response_shape(lambda_main):
    resp = lambda_main.build_response(200, {"hello": "world"})

    assert resp["statusCode"] == 200
    assert "headers" in resp
    assert resp["headers"]["Access-Control-Allow-Origin"] == "*"
    assert "OPTIONS" in resp["headers"]["Access-Control-Allow-Methods"]
    assert "Authorization" in resp["headers"]["Access-Control-Allow-Headers"]

    body = json.loads(resp["body"])
    assert body == {"hello": "world"}


def test_is_admin_user_false_when_no_claims(lambda_main):
    assert lambda_main.is_admin_user({}) is False


def test_is_admin_user_true_when_admins_group_present(lambda_main):
    event = {
        "requestContext": {
            "authorizer": {
                "claims": {
                    "cognito:groups": "Users,Admins"
                }
            }
        }
    }
    assert lambda_main.is_admin_user(event) is True


def test_is_admin_user_false_when_admins_group_absent(lambda_main):
    event = {
        "requestContext": {
            "authorizer": {
                "claims": {
                    "cognito:groups": "Users"
                }
            }
        }
    }
    assert lambda_main.is_admin_user(event) is False


def test_handler_get_files_non_admin_routes_to_user_view(lambda_main, monkeypatch):
    # Force non-admin path to avoid calling admin_view (currently incomplete)
    monkeypatch.setattr(lambda_main, "is_admin_user", lambda event: False)

    event = {
        "httpMethod": "GET",
        "resource": "/files",
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "a3348852-60b1-7089-10fe-a9f820df19e2",
                    "email": "user@example.com",
                }
            }
        },
    }

    resp = lambda_main.handler(event, None)
    assert resp["statusCode"] == 200


def test_handler_method_not_allowed(lambda_main):
    event = {"httpMethod": "POST", "resource": "/files"}
    resp = lambda_main.handler(event, None)

    assert resp["statusCode"] == 405
    body = json.loads(resp["body"])
    assert body["message"] == "Method not allowed"
