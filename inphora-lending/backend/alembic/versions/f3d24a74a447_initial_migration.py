"""Initial migration

Revision ID: f3d24a74a447
Revises: 
Create Date: 2026-02-23 15:51:12.363685

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3d24a74a447'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from sqlalchemy import inspect


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    insp = inspect(bind)

    # Only add columns if they do not already exist (pre-existing schema / manual changes)
    if insp.has_table('repayments'):
        existing_cols = {c['name'] for c in insp.get_columns('repayments')}
        if 'mpesa_transaction_id' not in existing_cols:
            op.add_column('repayments', sa.Column('mpesa_transaction_id', sa.String(length=100), nullable=True))
        if 'payment_method' not in existing_cols:
            op.add_column('repayments', sa.Column('payment_method', sa.String(length=20), nullable=True))

        # Add unique constraint only if missing
        existing_ucs = {tuple(uc['column_names']) for uc in insp.get_unique_constraints('repayments')}
        if ('mpesa_transaction_id',) not in existing_ucs:
            op.create_unique_constraint(None, 'repayments', ['mpesa_transaction_id'])


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    insp = inspect(bind)

    # Only drop constraint/columns if they exist, to avoid errors in drifted schemas.
    if insp.has_table('repayments'):
        existing_cols = {c['name'] for c in insp.get_columns('repayments')}
        existing_ucs = {tuple(uc['column_names']) for uc in insp.get_unique_constraints('repayments')}

        if ('mpesa_transaction_id',) in existing_ucs:
            op.drop_constraint(None, 'repayments', type_='unique')
        if 'payment_method' in existing_cols:
            op.drop_column('repayments', 'payment_method')
        if 'mpesa_transaction_id' in existing_cols:
            op.drop_column('repayments', 'mpesa_transaction_id')
