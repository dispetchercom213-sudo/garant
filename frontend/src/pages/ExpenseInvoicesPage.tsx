import { InvoicesPageNew } from './InvoicesPageNew';
import { InvoiceType } from '../types';

/**
 * Страница расходных накладных (EXPENSE)
 * Использует общий компонент InvoicesPageNew с фильтром type=EXPENSE
 */
export const ExpenseInvoicesPage = () => {
  return (
    <InvoicesPageNew 
      type={InvoiceType.EXPENSE} 
      title="Расходные накладные"
    />
  );
};



