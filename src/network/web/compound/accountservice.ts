import nfetch from "node-fetch";
import Fetchable from "../fetchable";

import { sleep } from "../../../utils"

export class Account {
  static CToken = class {
    json: any;
    constructor(json) {
      this.json = json;
    }

    address() {
      return this.json.address;
    }

    borrowBalanceUnderlying() {
      return this.json.borrow_balance_underlying.value;
    }

    supplyBalanceUnderlying() {
      return this.json.supply_balance_underlying.value;
    }
  };

  json: any;
  tokens: any;

  constructor(json) {
    this.json = json;
    this.tokens = json.tokens.map(t => new Account.CToken(t));
  }

  address() {
    return this.json.address;
  }

  health() {
    return this.json.health.value;
  }

  totalBorrowValueInEth() {
    return this.json.total_borrow_value_in_eth.value;
  }

  totalCollateralValueInEth() {
    return this.json.total_collateral_value_in_eth.value;
  }
}

export default class Accounts implements Fetchable {
  async fetch(withConfig) {
    const params = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    };

    const urlParams = Object.keys(withConfig)
      .map(key => key + "=" + withConfig[key])
      .join("&");

    try {
      const res = await nfetch(
        process.env.COMPOUND_ENDPOINT + "/account?" + urlParams,
        params
      );
      const json = await res.json();

      return {
        error: json.error,
        pagination: json.pagination_summary,
        accounts: json.accounts.map(i => new Account(i))
      };
    } catch (error) {
      return { error: error };
    }
  }

  async fetchAll(blockNo, forEachChunk = null) {
    let accounts = [];

    let i = 1;
    let pageCount = 0;

    let result;
    do {
      // Sleep on each iter to avoid API rate limiting
      await sleep(100);

      result = await this.fetch({
        page_number: i,
        page_size: 300,
        block_number: blockNo
      });
      if (result.error) {
        console.warn("Fetch AccountService failed: " + result.error.toString());
        continue;
      }

      pageCount = result.pagination.total_pages;
      i++;

      if (forEachChunk === null) accounts = accounts.concat(result.accounts);
      else forEachChunk(result.accounts);
    } while (i <= pageCount);

    return accounts;
  }
}
