import { useCallback, useState } from 'react';

import {
	CategoryDropdownItem,
	CategoryDropDownListProps,
} from '../definitions/CategoryDropdownDefinitions';

export const useCategoryDropdown = (
	originalData: CategoryDropDownListProps['groups'],
): [CategoryDropDownListProps['groups'], CategoryDropDownListProps['onSelected']] => {
	const [data, setData] = useState(originalData);

	const onSelected = useCallback(
		(item: CategoryDropdownItem) =>
			setData((prev) => {
				const items = prev.flatMap((group) => group.items);

				const itemsWithoutAll = items.filter(({ id }) => id !== 'all');
				const itemAll = items.find(({ id }) => id === 'all');
				const itemPrev = items.find(({ id }) => id === item.id);

				if (item.id === 'all') {
					itemsWithoutAll.forEach((i) => {
						i.checked = !item.checked;
					});
				}

				if (itemPrev) {
					itemPrev.checked = !itemPrev.checked;
				}

				if (itemAll) {
					itemAll.checked = itemsWithoutAll.every((i) => i.checked);
				}

				return [...prev];
			}),
		[],
	);
	return [data, onSelected];
};