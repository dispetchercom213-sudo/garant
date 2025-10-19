import { InvoicesPageNew } from './InvoicesPageNew';
import { InvoiceType } from '../types';

/**
 * Страница приходных накладных (INCOME)
 * Использует общий компонент InvoicesPageNew с фильтром type=INCOME
 */
export const IncomeInvoicesPage = () => {
  return (
    <InvoicesPageNew 
      type={InvoiceType.INCOME} 
      title="Приходные накладные"
    />
  );
};



