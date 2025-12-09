from core.business.egyptian_compliance import EgyptianEinvoiceBuilder


def test_einvoice_builder_generates_basic_xml():
    builder = EgyptianEinvoiceBuilder()
    xml = builder.build(
        invoice={
            "external_ref": "Q-123",
            "date": "2024-01-01",
            "customer_name": "Test Buyer",
            "vat_amount": 140.0,
        },
        line_items=[
            {"description": "Item A", "quantity": 2, "unit_price": 500},
            {"description": "Item B", "quantity": 1, "unit_price": 100},
        ],
        buyer_tax_id="EG123456789",
        currency="EGP",
    )

    assert "<Invoice" in xml
    assert "<TaxID>EG123456789</TaxID>" in xml
    assert "<Subtotal>1100.000</Subtotal>" in xml
    assert "<VAT>140.000</VAT>" in xml
    assert "<GrandTotal>1240.000</GrandTotal>" in xml
